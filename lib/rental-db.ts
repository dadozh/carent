import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Customer, CustomerUpdateInput, FuelLevel, Reservation, SwapReasonType } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/date-format";
import { RESERVATION_BLOCKING_STATUSES, VEHICLE_TURNAROUND_MS, reservationBlocksPeriod } from "@/lib/reservation-rules";
import { getReservationOutstandingAmount } from "@/lib/reservation-payments";
import { getVehicleById, updateVehicle } from "@/lib/vehicle-db";
import { getTenantSettings } from "@/lib/auth-db";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

type CustomerInput = Omit<Customer, "id" | "verified" | "totalRentals" | "totalSpent" | "images"> & {
  verified?: boolean;
  images?: string[];
};

type ReservationInput = Omit<
  Reservation,
  "id" | "createdAt" | "vehiclePlate" | "images" | "customerName" | "vehicleName" | "dailyRate" | "totalCost"
> & {
  createdAt?: string;
  vehiclePlate?: string;
  dailyRate?: number;
  images?: string[];
};

export interface PublicBookingCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
}

export interface PublicBookingInput {
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  extras: string[];
  customer: PublicBookingCustomerInput;
}

type ReservationStatusUpdate = {
  status: Reservation["status"];
  cancellationReason?: string;
  adjustedCost?: number;
};

export type VehicleSwapInput = {
  toVehicleId: string;
  toVehicleName: string;
  toVehiclePlate: string;
  reason: string;
  reasonType: SwapReasonType;
  fromVehicleCondition?: string;
};

export type ExtendReservationInput = {
  newEndDate: string;
  newReturnTime: string;
};

export type ReturnChecklistInput = {
  returnMileage: number;
  fuelLevel: FuelLevel;
  hasDamage: boolean;
  damageDescription?: string;
  extraCharges?: number;
  notes?: string;
  returnPhotos?: string[];
};

export type MarkReservationPaidInput = {
  method: "cash";
};

export interface ReservationListFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  limit?: number;
}

interface JsonRow {
  data: string;
}

interface IdRow {
  id: string;
}

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;

  if (!DB_PATH.startsWith(":")) mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing("customers", "tenant_id", "TEXT NOT NULL DEFAULT 't_default'");

  // Migrate reservations to composite (tenant_id, id) primary key so each tenant
  // can have its own sequential counter without global ID collisions.
  migrateReservationsToCompositePk();

  return db;
}

function migrateReservationsToCompositePk() {
  const info = db!
    .prepare("PRAGMA table_info(reservations)")
    .all() as Array<{ name: string; pk: number }>;

  const idPk = info.find((c) => c.name === "id")?.pk ?? 0;
  const tenantPk = info.find((c) => c.name === "tenant_id")?.pk ?? 0;

  // Already on composite PK schema — nothing to do.
  if (tenantPk > 0) return;

  // Old schema: id is the sole primary key. Recreate with composite PK.
  // tenant_id may or may not already exist as a plain column.
  const hasTenantCol = info.some((c) => c.name === "tenant_id");
  const selectTenant = hasTenantCol ? "COALESCE(tenant_id, 't_default')" : "'t_default'";

  db!.exec(`
    CREATE TABLE reservations_new (
      id         TEXT NOT NULL,
      tenant_id  TEXT NOT NULL DEFAULT 't_default',
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO reservations_new (id, tenant_id, data, created_at, updated_at)
      SELECT id, ${selectTenant}, data, created_at, updated_at FROM reservations;
    DROP TABLE reservations;
    ALTER TABLE reservations_new RENAME TO reservations;
  `);

  // Suppress unused variable warning for idPk
  void idPk;
}

function addColumnIfMissing(tableName: string, columnName: string, columnDef: string) {
  const cols = db!.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((col) => col.name === columnName)) {
    db!.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
  }
}

/** For testing only — closes and resets the DB singleton. */
export function __closeDb() {
  db?.close();
  db = null;
}

function parseCustomer(row: JsonRow): Customer {
  const customer = JSON.parse(row.data) as Customer;
  return {
    ...customer,
    images: normalizeImageList(customer.images),
  };
}

function parseReservation(row: JsonRow): Reservation {
  const reservation = JSON.parse(row.data) as Reservation;
  const legacyPayment = reservation.payment
    ? [{
        paidAt: reservation.payment.paidAt,
        method: reservation.payment.method,
        amount: reservation.payment.amountPaid ?? reservation.totalCost,
      }]
    : [];

  return {
    ...reservation,
    vehiclePlate: reservation.vehiclePlate ?? "",
    images: normalizeImageList(reservation.images),
    payments: (reservation.payments ?? legacyPayment).filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0),
    payment: undefined,
  };
}

function normalizeImageList(images?: string[]) {
  return (images ?? []).filter((image) => image.trim());
}

function getNextReservationId(tenantId: string) {
  const rows = getDb()
    .prepare("SELECT id FROM reservations WHERE tenant_id = ?")
    .all(tenantId) as IdRow[];
  const currentMax = rows.reduce((max, row) => {
    if (!/^\d+$/.test(row.id)) return max;
    return Math.max(max, Number(row.id));
  }, 0);

  return String(currentMax + 1);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCustomer(input: CustomerInput) {
  if (!input.firstName?.trim()) throw new Error("Customer first name is required");
  if (!input.lastName?.trim()) throw new Error("Customer last name is required");
  if (!input.email?.trim() || !isValidEmail(input.email)) throw new Error("Valid customer email is required");
  if (!input.phone?.trim() || input.phone.trim().length < 6) throw new Error("Valid customer phone is required");
  if (!input.licenseNumber?.trim()) throw new Error("Customer license number is required");
  if (!input.licenseExpiry?.trim()) throw new Error("Customer license expiry is required");
}

function findDuplicateCustomer(input: CustomerInput, tenantId: string) {
  const email = normalize(input.email);
  const licenseNumber = normalize(input.licenseNumber);

  return listCustomers(tenantId).find((customer) =>
    normalize(customer.email) === email || normalize(customer.licenseNumber) === licenseNumber
  );
}

function createCustomerRecord(input: CustomerInput, tenantId: string): Customer {
  const customer: Customer = {
    ...input,
    id: `c_${randomUUID()}`,
    verified: input.verified ?? true,
    totalRentals: 0,
    totalSpent: 0,
    images: normalizeImageList(input.images),
  };

  getDb()
    .prepare("INSERT INTO customers (id, tenant_id, data) VALUES (?, ?, ?)")
    .run(customer.id, tenantId, JSON.stringify(customer));

  return customer;
}

export function listCustomers(tenantId: string): Customer[] {
  const rows = getDb()
    .prepare("SELECT data FROM customers WHERE tenant_id = ? ORDER BY created_at DESC")
    .all(tenantId) as JsonRow[];

  return rows.map(parseCustomer);
}

export function getCustomerById(id: string, tenantId: string): Customer | null {
  const row = getDb()
    .prepare("SELECT data FROM customers WHERE id = ? AND tenant_id = ?")
    .get(id, tenantId) as JsonRow | undefined;

  return row ? parseCustomer(row) : null;
}

export function createCustomer(input: CustomerInput, tenantId: string): Customer {
  validateCustomer(input);

  const duplicate = findDuplicateCustomer(input, tenantId);
  if (duplicate) {
    throw new Error("A customer with this email or license number already exists");
  }

  return createCustomerRecord(input, tenantId);
}

export function updateCustomerImages(id: string, images: string[], tenantId: string): Customer {
  const customer = getCustomerById(id, tenantId);
  if (!customer) throw new Error("Customer not found");

  const updatedCustomer: Customer = {
    ...customer,
    images: normalizeImageList(images),
  };

  getDb()
    .prepare("UPDATE customers SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedCustomer), id, tenantId);

  return updatedCustomer;
}

export function updateCustomer(id: string, input: CustomerUpdateInput, tenantId: string): Customer {
  const customer = getCustomerById(id, tenantId);
  if (!customer) throw new Error("Customer not found");

  // Validate any required fields being changed
  const merged = { ...customer, ...input };
  if (!merged.firstName?.trim()) throw new Error("Customer first name is required");
  if (!merged.lastName?.trim()) throw new Error("Customer last name is required");
  if (!merged.email?.trim() || !isValidEmail(merged.email)) throw new Error("Valid customer email is required");
  if (!merged.phone?.trim() || merged.phone.trim().length < 6) throw new Error("Valid customer phone is required");
  if (!merged.licenseNumber?.trim()) throw new Error("Customer license number is required");
  if (!merged.licenseExpiry?.trim()) throw new Error("Customer license expiry is required");

  // Check for duplicates on email/license change, excluding the current customer
  const emailChanged = input.email && normalize(input.email) !== normalize(customer.email);
  const licenseChanged = input.licenseNumber && normalize(input.licenseNumber) !== normalize(customer.licenseNumber);
  if (emailChanged || licenseChanged) {
    const newEmail = normalize(merged.email);
    const newLicense = normalize(merged.licenseNumber);
    const duplicate = listCustomers(tenantId).find(
      (c) => c.id !== id && (normalize(c.email) === newEmail || normalize(c.licenseNumber) === newLicense)
    );
    if (duplicate) throw new Error("A customer with this email or license number already exists");
  }

  const updatedCustomer: Customer = {
    ...customer,
    ...input,
    // Keep computed fields unchanged
    id: customer.id,
    totalRentals: customer.totalRentals,
    totalSpent: customer.totalSpent,
    images: customer.images,
  };

  getDb()
    .prepare("UPDATE customers SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedCustomer), id, tenantId);

  return updatedCustomer;
}

function reservationMatchesFilters(reservation: Reservation, filters: ReservationListFilters) {
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const haystack = `${reservation.customerName} ${reservation.vehicleName} ${reservation.vehiclePlate} ${reservation.id}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (filters.status && filters.status !== "all") {
    const statuses = new Set(filters.status.split(",").map((status) => status.trim()).filter(Boolean));
    if (!statuses.has(reservation.status)) return false;
  }

  if (filters.overdue) {
    const returnTime = reservation.returnTime ?? "00:00";
    const returnTs = new Date(`${reservation.endDate}T${returnTime}`).getTime();
    if (
      reservation.status !== "active" ||
      Number.isNaN(returnTs) ||
      returnTs >= Date.now()
    ) {
      return false;
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    const reservationStart = new Date(`${reservation.startDate}T${reservation.pickupTime}`).getTime();
    const reservationEnd = new Date(`${reservation.endDate}T${reservation.returnTime}`).getTime();
    const filterStart = filters.dateFrom
      ? new Date(`${filters.dateFrom}T00:00`).getTime()
      : Number.NEGATIVE_INFINITY;
    const filterEnd = filters.dateTo
      ? new Date(`${filters.dateTo}T23:59`).getTime()
      : Number.POSITIVE_INFINITY;

    if (
      Number.isNaN(reservationStart) ||
      Number.isNaN(reservationEnd) ||
      Number.isNaN(filterStart) ||
      Number.isNaN(filterEnd) ||
      reservationStart > filterEnd ||
      filterStart > reservationEnd
    ) {
      return false;
    }
  }

  return true;
}

export function listReservationsWithTotal(tenantId: string, filters: ReservationListFilters = {}) {
  const rows = getDb()
    .prepare("SELECT data FROM reservations WHERE tenant_id = ? ORDER BY created_at DESC")
    .all(tenantId) as JsonRow[];

  const reservations = rows
    .map(parseReservation)
    .filter((reservation) => reservationMatchesFilters(reservation, filters))
    .sort((a, b) => {
      const aEnd = `${a.endDate}T${a.returnTime ?? "00:00"}`;
      const bEnd = `${b.endDate}T${b.returnTime ?? "00:00"}`;
      return bEnd.localeCompare(aEnd);
    });
  const limitedReservations = typeof filters.limit === "number" && filters.limit > 0
    ? reservations.slice(0, filters.limit)
    : reservations;

  return {
    reservations: limitedReservations,
    total: reservations.length,
  };
}

export function listReservations(tenantId: string, filters: ReservationListFilters = {}): Reservation[] {
  return listReservationsWithTotal(tenantId, filters).reservations;
}

export function getReservationById(id: string, tenantId: string): Reservation | null {
  const row = getDb()
    .prepare("SELECT data FROM reservations WHERE id = ? AND tenant_id = ?")
    .get(id, tenantId) as JsonRow | undefined;

  return row ? parseReservation(row) : null;
}

export function updateReservationStatus(id: string, input: ReservationStatusUpdate, tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");

  if (!["cancelled", "active"].includes(input.status)) {
    throw new Error("Unsupported reservation status update");
  }

  if (input.status === "active") {
    if (reservation.status === "active") {
      return reservation;
    }

    if (reservation.status !== "confirmed") {
      throw new Error("Only confirmed reservations can be started");
    }

    const updatedReservation: Reservation = {
      ...reservation,
      status: "active",
    };

    getDb()
      .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
      .run(JSON.stringify(updatedReservation), id, tenantId);

    updateVehicle(reservation.vehicleId, { status: "rented" }, tenantId);

    return updatedReservation;
  }

  if (reservation.status === "completed") {
    throw new Error("Completed reservations cannot be cancelled");
  }

  if (reservation.status === "cancelled") {
    return reservation;
  }

  const updatedReservation: Reservation = {
    ...reservation,
    status: input.status,
    ...(input.cancellationReason !== undefined && { cancellationReason: input.cancellationReason }),
    ...(input.adjustedCost !== undefined && { adjustedCost: input.adjustedCost }),
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  return updatedReservation;
}

export function swapReservationVehicle(id: string, input: VehicleSwapInput, tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Vehicle swap is only allowed for active reservations");

  const newVehicle = getVehicleById(input.toVehicleId, tenantId);
  if (!newVehicle) throw new Error("Replacement vehicle not found");
  if (newVehicle.status !== "available") throw new Error("Replacement vehicle is not available");

  const swap = {
    fromVehicleId: reservation.vehicleId,
    fromVehicleName: reservation.vehicleName,
    fromVehiclePlate: reservation.vehiclePlate,
    toVehicleId: input.toVehicleId,
    toVehicleName: input.toVehicleName,
    toVehiclePlate: input.toVehiclePlate,
    swappedAt: new Date().toISOString(),
    reason: input.reason,
    reasonType: input.reasonType,
    fromVehicleCondition: input.fromVehicleCondition,
  };

  const updatedReservation: Reservation = {
    ...reservation,
    vehicleId: input.toVehicleId,
    vehicleName: input.toVehicleName,
    vehiclePlate: input.toVehiclePlate,
    vehicleSwaps: [...(reservation.vehicleSwaps ?? []), swap],
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  // Update vehicle statuses: outgoing → maintenance (breakdown/accident) or available (other),
  // incoming → rented.
  const outgoingStatus = (input.reasonType === "breakdown" || input.reasonType === "accident")
    ? "maintenance" as const
    : "available" as const;
  updateVehicle(reservation.vehicleId, { status: outgoingStatus }, tenantId);
  updateVehicle(input.toVehicleId, { status: "rented" }, tenantId);

  return updatedReservation;
}

export function extendReservation(id: string, input: ExtendReservationInput, tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Only active reservations can be extended");

  const currentEnd = new Date(`${reservation.endDate}T${reservation.returnTime}`);
  const newEnd = new Date(`${input.newEndDate}T${input.newReturnTime}`);

  if (Number.isNaN(currentEnd.getTime()) || Number.isNaN(newEnd.getTime())) {
    throw new Error("Invalid return date or time");
  }
  if (newEnd <= currentEnd) {
    throw new Error(`New return date must be after the current return date (${formatDateTime(reservation.endDate, reservation.returnTime)})`);
  }

  // Check for conflicts in the extension window (currentEnd → newEnd + turnaround).
  const conflict = listReservations(tenantId).find((r) =>
    r.id !== reservation.id &&
    r.vehicleId === reservation.vehicleId &&
    RESERVATION_BLOCKING_STATUSES.includes(r.status) &&
    reservationBlocksPeriod(r, currentEnd.getTime(), newEnd.getTime() + VEHICLE_TURNAROUND_MS)
  );
  if (conflict) throw new Error("Vehicle is already reserved during the extended period");

  const additionalDays = Math.ceil((newEnd.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
  const additionalCost = additionalDays * reservation.dailyRate;

  const extension = {
    previousEndDate: reservation.endDate,
    previousReturnTime: reservation.returnTime,
    newEndDate: input.newEndDate,
    newReturnTime: input.newReturnTime,
    additionalCost,
    extendedAt: new Date().toISOString(),
  };

  const updatedReservation: Reservation = {
    ...reservation,
    endDate: input.newEndDate,
    returnTime: input.newReturnTime,
    totalCost: reservation.totalCost + additionalCost,
    extensions: [...(reservation.extensions ?? []), extension],
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  return updatedReservation;
}

export function completeReservationReturn(id: string, input: ReturnChecklistInput, tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Only active reservations can be returned");

  const returnChecklist = {
    ...input,
    returnPhotos: input.returnPhotos ?? [],
    completedAt: new Date().toISOString(),
  };

  const updatedReservation: Reservation = {
    ...reservation,
    status: "completed",
    returnChecklist,
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  // Update vehicle: mileage + status (maintenance if damaged, available otherwise).
  const vehicleStatus = input.hasDamage ? "maintenance" as const : "available" as const;
  updateVehicle(reservation.vehicleId, { mileage: input.returnMileage, status: vehicleStatus }, tenantId);

  return updatedReservation;
}

export function markReservationPaid(id: string, input: MarkReservationPaidInput, tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status === "cancelled") throw new Error("Cannot mark a cancelled reservation as paid");
  const outstandingAmount = getReservationOutstandingAmount(reservation);
  if (outstandingAmount <= 0) {
    throw new Error("Reservation is already marked as paid");
  }

  const updatedReservation: Reservation = {
    ...reservation,
    payments: [
      ...(reservation.payments ?? []),
      {
        paidAt: new Date().toISOString(),
        method: input.method,
        amount: outstandingAmount,
      },
    ],
    payment: undefined,
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  return updatedReservation;
}

export function updateReservationImages(id: string, images: string[], tenantId: string): Reservation {
  const reservation = getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");

  const updatedReservation: Reservation = {
    ...reservation,
    images: normalizeImageList(images),
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedReservation), id, tenantId);

  return updatedReservation;
}

function getRentalDurationMs(input: ReservationInput) {
  const pickup = new Date(`${input.startDate}T${input.pickupTime}`);
  const dropoff = new Date(`${input.endDate}T${input.returnTime}`);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) {
    throw new Error("Invalid reservation pickup or return date/time");
  }

  return dropoff.getTime() - pickup.getTime();
}

function getRentalStart(input: ReservationInput) {
  return new Date(`${input.startDate}T${input.pickupTime}`);
}

function getRentalEnd(input: ReservationInput) {
  return new Date(`${input.endDate}T${input.returnTime}`);
}

function getBillableDays(input: ReservationInput) {
  return Math.ceil(getRentalDurationMs(input) / (1000 * 60 * 60 * 24));
}

function validateReservationPeriod(input: ReservationInput) {
  const durationMs = getRentalDurationMs(input);
  const pickup = getRentalStart(input);

  if (durationMs <= 0) {
    throw new Error("Return date and time must be after pickup date and time");
  }

  if (durationMs < 24 * 60 * 60 * 1000) {
    throw new Error("Reservation must be at least 24 hours");
  }

  if (pickup.getTime() < Date.now()) {
    throw new Error("Pickup date and time cannot be in the past");
  }
}

function validateReservationCustomer(input: ReservationInput, tenantId: string) {
  const customer = getCustomerById(input.customerId, tenantId);
  if (!customer) throw new Error("Customer not found");
  validateCustomer(customer);

  const licenseExpiry = new Date(`${customer.licenseExpiry}T23:59`);
  if (Number.isNaN(licenseExpiry.getTime()) || licenseExpiry < getRentalEnd(input)) {
    throw new Error("Customer license must be valid through the return date");
  }

  return customer;
}

function validateReservationVehicle(input: ReservationInput, tenantId: string) {
  const vehicle = getVehicleById(input.vehicleId, tenantId);
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.status !== "available") throw new Error("Vehicle is not available for booking");
  return vehicle;
}

function validateReservationExtras(input: ReservationInput, tenantId: string) {
  const allowedExtras = new Set(getTenantSettings(tenantId).extras);
  const invalidExtra = input.extras.find((extra) => !allowedExtras.has(extra));
  if (invalidExtra) throw new Error(`Unsupported reservation extra: ${invalidExtra}`);
}

function validateReservationLocations(input: ReservationInput, tenantId: string) {
  const allowedLocations = new Set(getTenantSettings(tenantId).locations);
  if (!allowedLocations.has(input.pickupLocation)) {
    throw new Error("Unsupported pickup location");
  }
  if (!allowedLocations.has(input.returnLocation)) {
    throw new Error("Unsupported return location");
  }
}

function reservationsOverlap(a: ReservationInput, b: Reservation) {
  const aStart = getRentalStart(a).getTime();
  const aEnd = getRentalEnd(a).getTime();

  return reservationBlocksPeriod(b, aStart, aEnd);
}

function validateVehicleReservationConflict(input: ReservationInput, tenantId: string) {
  const conflict = listReservations(tenantId).find((reservation) =>
    reservation.vehicleId === input.vehicleId &&
    RESERVATION_BLOCKING_STATUSES.includes(reservation.status) &&
    reservationsOverlap(input, reservation)
  );

  if (conflict) throw new Error("Vehicle is already reserved for the selected period");
}

export function createReservation(input: ReservationInput, tenantId: string): Reservation {
  validateReservationPeriod(input);
  const customer = validateReservationCustomer(input, tenantId);
  validateReservationLocations(input, tenantId);
  validateReservationExtras(input, tenantId);
  const vehicle = validateReservationVehicle(input, tenantId);
  validateVehicleReservationConflict(input, tenantId);
  const billableDays = getBillableDays(input);
  const dailyRate = input.dailyRate ?? vehicle.dailyRate;

  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new Error("Daily rate must be greater than zero");
  }

  const totalCost = dailyRate * billableDays;

  const reservation: Reservation = {
    ...input,
    id: getNextReservationId(tenantId),
    customerName: `${customer.firstName} ${customer.lastName}`,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    vehiclePlate: vehicle.plate,
    dailyRate,
    totalCost,
    createdAt: input.createdAt ?? new Date().toISOString().slice(0, 10),
    images: normalizeImageList(input.images),
  };

  getDb()
    .prepare("INSERT INTO reservations (id, tenant_id, data) VALUES (?, ?, ?)")
    .run(reservation.id, tenantId, JSON.stringify(reservation));

  const updatedCustomer: Customer = {
    ...customer,
    totalRentals: customer.totalRentals + 1,
    totalSpent: customer.totalSpent + reservation.totalCost,
  };
  getDb()
    .prepare("UPDATE customers SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?")
    .run(JSON.stringify(updatedCustomer), customer.id, tenantId);

  return reservation;
}

export function createPublicReservation(input: PublicBookingInput, tenantId: string): Reservation {
  const customerInput: CustomerInput = {
    ...input.customer,
    verified: false,
  };

  validateCustomer(customerInput);

  const existingCustomer = findDuplicateCustomer(customerInput, tenantId);
  const customer = existingCustomer ?? createCustomerRecord(customerInput, tenantId);

  const reservationInput: ReservationInput = {
    customerId: customer.id,
    vehicleId: input.vehicleId,
    startDate: input.startDate,
    endDate: input.endDate,
    pickupTime: "09:00",
    returnTime: "09:00",
    pickupLocation: input.pickupLocation,
    returnLocation: input.returnLocation,
    extras: input.extras,
    status: "pending",
    notes: "Public booking",
  };

  return createReservation(reservationInput, tenantId);
}
