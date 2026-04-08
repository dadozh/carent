import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Customer, Reservation } from "@/lib/mock-data";
import { RESERVATION_BLOCKING_STATUSES, reservationBlocksPeriod } from "@/lib/reservation-rules";
import { getVehicleById } from "@/lib/vehicle-db";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "carent.sqlite");

type CustomerInput = Omit<Customer, "id" | "verified" | "totalRentals" | "totalSpent" | "images"> & {
  verified?: boolean;
  images?: string[];
};

type ReservationInput = Omit<Reservation, "id" | "createdAt" | "vehiclePlate" | "images"> & {
  createdAt?: string;
  vehiclePlate?: string;
  images?: string[];
};

type ReservationStatusUpdate = {
  status: Reservation["status"];
};

export interface ReservationListFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
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

  mkdirSync(DATA_DIR, { recursive: true });
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

  return db;
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
  return {
    ...reservation,
    vehiclePlate: reservation.vehiclePlate ?? "",
    images: normalizeImageList(reservation.images),
  };
}

function normalizeImageList(images?: string[]) {
  return (images ?? []).filter((image) => image.trim());
}

function getNextReservationId() {
  const rows = getDb()
    .prepare("SELECT id FROM reservations")
    .all() as IdRow[];
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

function findDuplicateCustomer(input: CustomerInput) {
  const email = normalize(input.email);
  const licenseNumber = normalize(input.licenseNumber);

  return listCustomers().find((customer) =>
    normalize(customer.email) === email || normalize(customer.licenseNumber) === licenseNumber
  );
}

export function listCustomers(): Customer[] {
  const rows = getDb()
    .prepare("SELECT data FROM customers ORDER BY created_at DESC")
    .all() as JsonRow[];

  return rows.map(parseCustomer);
}

export function getCustomerById(id: string): Customer | null {
  const row = getDb()
    .prepare("SELECT data FROM customers WHERE id = ?")
    .get(id) as JsonRow | undefined;

  return row ? parseCustomer(row) : null;
}

export function createCustomer(input: CustomerInput): Customer {
  validateCustomer(input);

  const duplicate = findDuplicateCustomer(input);
  if (duplicate) {
    throw new Error("A customer with this email or license number already exists");
  }

  const customer: Customer = {
    ...input,
    id: `c_${randomUUID()}`,
    verified: input.verified ?? true,
    totalRentals: 0,
    totalSpent: 0,
    images: normalizeImageList(input.images),
  };

  getDb()
    .prepare("INSERT INTO customers (id, data) VALUES (?, ?)")
    .run(customer.id, JSON.stringify(customer));

  return customer;
}

export function updateCustomerImages(id: string, images: string[]): Customer {
  const customer = getCustomerById(id);
  if (!customer) throw new Error("Customer not found");

  const updatedCustomer: Customer = {
    ...customer,
    images: normalizeImageList(images),
  };

  getDb()
    .prepare("UPDATE customers SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(updatedCustomer), id);

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

export function listReservationsWithTotal(filters: ReservationListFilters = {}) {
  const rows = getDb()
    .prepare("SELECT data FROM reservations ORDER BY created_at DESC")
    .all() as JsonRow[];

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

export function listReservations(filters: ReservationListFilters = {}): Reservation[] {
  return listReservationsWithTotal(filters).reservations;
}

export function getReservationById(id: string): Reservation | null {
  const row = getDb()
    .prepare("SELECT data FROM reservations WHERE id = ?")
    .get(id) as JsonRow | undefined;

  return row ? parseReservation(row) : null;
}

export function updateReservationStatus(id: string, input: ReservationStatusUpdate): Reservation {
  const reservation = getReservationById(id);
  if (!reservation) throw new Error("Reservation not found");

  if (input.status !== "cancelled") {
    throw new Error("Unsupported reservation status update");
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
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(updatedReservation), id);

  return updatedReservation;
}

export function updateReservationImages(id: string, images: string[]): Reservation {
  const reservation = getReservationById(id);
  if (!reservation) throw new Error("Reservation not found");

  const updatedReservation: Reservation = {
    ...reservation,
    images: normalizeImageList(images),
  };

  getDb()
    .prepare("UPDATE reservations SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(updatedReservation), id);

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

function validateReservationCustomer(input: ReservationInput) {
  const customer = getCustomerById(input.customerId);
  if (!customer) throw new Error("Customer not found");
  validateCustomer(customer);

  const licenseExpiry = new Date(`${customer.licenseExpiry}T23:59`);
  if (Number.isNaN(licenseExpiry.getTime()) || licenseExpiry < getRentalEnd(input)) {
    throw new Error("Customer license must be valid through the return date");
  }

  return customer;
}

function validateReservationVehicle(input: ReservationInput) {
  const vehicle = getVehicleById(input.vehicleId);
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.status !== "available") throw new Error("Vehicle is not available for booking");
  return vehicle;
}

function validateReservationExtras(input: ReservationInput) {
  const allowedExtras = new Set(["GPS", "Wi-Fi", "Child Seat"]);
  const invalidExtra = input.extras.find((extra) => !allowedExtras.has(extra));
  if (invalidExtra) throw new Error(`Unsupported reservation extra: ${invalidExtra}`);
}

function reservationsOverlap(a: ReservationInput, b: Reservation) {
  const aStart = getRentalStart(a).getTime();
  const aEnd = getRentalEnd(a).getTime();

  return reservationBlocksPeriod(b, aStart, aEnd);
}

function validateVehicleReservationConflict(input: ReservationInput) {
  const conflict = listReservations().find((reservation) =>
    reservation.vehicleId === input.vehicleId &&
    RESERVATION_BLOCKING_STATUSES.includes(reservation.status) &&
    reservationsOverlap(input, reservation)
  );

  if (conflict) throw new Error("Vehicle is already reserved for the selected period");
}

export function createReservation(input: ReservationInput): Reservation {
  validateReservationPeriod(input);
  const customer = validateReservationCustomer(input);
  validateReservationExtras(input);
  const vehicle = validateReservationVehicle(input);
  validateVehicleReservationConflict(input);
  const billableDays = getBillableDays(input);
  const totalCost = vehicle.dailyRate * billableDays;

  const reservation: Reservation = {
    ...input,
    id: getNextReservationId(),
    customerName: `${customer.firstName} ${customer.lastName}`,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    vehiclePlate: vehicle.plate,
    dailyRate: vehicle.dailyRate,
    totalCost,
    createdAt: input.createdAt ?? new Date().toISOString().slice(0, 10),
    images: normalizeImageList(input.images),
  };

  getDb()
    .prepare("INSERT INTO reservations (id, data) VALUES (?, ?)")
    .run(reservation.id, JSON.stringify(reservation));

  if (customer) {
    const updatedCustomer: Customer = {
      ...customer,
      totalRentals: customer.totalRentals + 1,
      totalSpent: customer.totalSpent + reservation.totalCost,
    };
    getDb()
      .prepare("UPDATE customers SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(updatedCustomer), customer.id);
  }

  return reservation;
}
