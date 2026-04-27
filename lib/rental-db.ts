import { randomUUID } from "node:crypto";
import { and, count as sqlCount, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customerImages,
  customers,
  reservationExtensions,
  reservationExtras,
  reservationImages,
  reservationPayments,
  reservations,
  returnChecklists,
  tenantReservationCounters,
  vehicleSwaps,
} from "@/lib/db/schema";
import type { Customer, CustomerUpdateInput, FuelLevel, Reservation, SwapReasonType, Vehicle } from "@/lib/mock-data";
import { getTenantSettings } from "@/lib/auth-db";
import { appendVehicleMaintenanceLog, getVehicleById, updateVehicle } from "@/lib/vehicle-db";
import { RESERVATION_BLOCKING_STATUSES, VEHICLE_TURNAROUND_MS, reservationBlocksPeriod } from "@/lib/reservation-rules";
import { calculateCost, resolveTier } from "@/lib/pricing";
import { getEffectiveTiers } from "@/lib/pricing-db";
import { getReservationOutstandingAmount } from "@/lib/reservation-payments";
import type { Transaction } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  firstName: string; lastName: string; email: string; phone: string;
  licenseNumber: string; licenseExpiry: string; address: string;
}

export interface PublicBookingInput {
  vehicleId: string; startDate: string; endDate: string;
  pickupLocation: string; returnLocation: string; extras: string[];
  customer: PublicBookingCustomerInput;
}

type ReservationStatusUpdate = { status: Reservation["status"]; cancellationReason?: string; adjustedCost?: number };

export type VehicleSwapInput = {
  toVehicleId: string; toVehicleName: string; toVehiclePlate: string;
  reason: string; reasonType: SwapReasonType; fromVehicleCondition?: string;
};

export type ExtendReservationInput = { newEndDate: string; newReturnTime: string };

export type ReturnChecklistInput = {
  returnMileage: number; fuelLevel: FuelLevel; hasDamage: boolean;
  damageDescription?: string; extraCharges?: number; notes?: string; returnPhotos?: string[];
};

export type MarkReservationPaidInput = { method: "cash" };

export interface ReservationListFilters {
  search?: string; status?: string; dateFrom?: string; dateTo?: string;
  overdue?: boolean; limit?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? "0")) || 0;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Customer assembly ────────────────────────────────────────────────────────

async function assembleCustomer(row: typeof customers.$inferSelect): Promise<Customer> {
  const imgs = await db.select().from(customerImages).where(eq(customerImages.customerId, row.id)).orderBy(customerImages.position);
  return {
    id: row.id,
    firstName: row.firstName, lastName: row.lastName,
    email: row.email, phone: row.phone,
    licenseNumber: row.licenseNumber, licenseExpiry: row.licenseExpiry,
    address: row.address, verified: row.verified, blacklisted: row.blacklisted ?? false,
    internalNotes: row.internalNotes ?? undefined,
    totalRentals: row.totalRentals, totalSpent: toNum(row.totalSpent),
    images: imgs.map((i) => i.url),
  };
}

// ─── Reservation assembly ─────────────────────────────────────────────────────

async function assembleReservation(
  row: typeof reservations.$inferSelect,
  tx: Transaction | typeof db = db
): Promise<Reservation> {
  const [extras, extensions, payments, swaps, checklist, images] = await Promise.all([
    tx.select().from(reservationExtras)
      .where(and(eq(reservationExtras.tenantId, row.tenantId), eq(reservationExtras.reservationId, row.id)))
      .orderBy(reservationExtras.position),
    tx.select().from(reservationExtensions)
      .where(and(eq(reservationExtensions.tenantId, row.tenantId), eq(reservationExtensions.reservationId, row.id))),
    tx.select().from(reservationPayments)
      .where(and(eq(reservationPayments.tenantId, row.tenantId), eq(reservationPayments.reservationId, row.id))),
    tx.select().from(vehicleSwaps)
      .where(and(eq(vehicleSwaps.tenantId, row.tenantId), eq(vehicleSwaps.reservationId, row.id))),
    tx.select().from(returnChecklists)
      .where(and(eq(returnChecklists.tenantId, row.tenantId), eq(returnChecklists.reservationId, row.id))).limit(1),
    tx.select().from(reservationImages)
      .where(and(eq(reservationImages.tenantId, row.tenantId), eq(reservationImages.reservationId, row.id)))
      .orderBy(reservationImages.position),
  ]);

  const paymentsList = payments.map((p) => ({
    paidAt: p.paidAt.toISOString(),
    method: p.method as "cash",
    amount: toNum(p.amount),
  }));
  const lastPayment = paymentsList.at(-1);
  const totalPaid = paymentsList.reduce((s, p) => s + p.amount, 0);

  const checklist0 = checklist[0];
  const returnChecklist = checklist0 ? {
    returnMileage: checklist0.returnMileage,
    fuelLevel: checklist0.fuelLevel as FuelLevel,
    hasDamage: checklist0.hasDamage,
    damageDescription: checklist0.damageDescription ?? undefined,
    extraCharges: toNum(checklist0.extraCharges),
    notes: checklist0.notes ?? undefined,
    returnPhotos: images.filter((i) => i.source === "return").map((i) => i.url),
    completedAt: checklist0.completedAt.toISOString(),
  } : undefined;

  return {
    id: row.id,
    customerId: row.customerId, customerName: row.customerName,
    vehicleId: row.vehicleId, vehicleName: row.vehicleName, vehiclePlate: row.vehiclePlate,
    startDate: row.startDate, pickupTime: row.pickupTime,
    endDate: row.endDate, returnTime: row.returnTime,
    status: row.status as Reservation["status"],
    dailyRate: toNum(row.dailyRate), totalCost: toNum(row.totalCost),
    extras: extras.map((e) => e.extra),
    pickupLocation: row.pickupLocation, returnLocation: row.returnLocation,
    notes: row.notes, createdAt: row.createdAt,
    cancellationReason: row.cancellationReason ?? undefined,
    adjustedCost: row.adjustedCost != null ? toNum(row.adjustedCost) : undefined,
    vehicleSwaps: swaps.map((s) => ({
      fromVehicleId: s.fromVehicleId, fromVehicleName: s.fromVehicleName, fromVehiclePlate: s.fromVehiclePlate,
      toVehicleId: s.toVehicleId, toVehicleName: s.toVehicleName, toVehiclePlate: s.toVehiclePlate,
      swappedAt: s.swappedAt.toISOString(), reason: s.reason,
      reasonType: s.reasonType as SwapReasonType, fromVehicleCondition: s.fromVehicleCondition ?? undefined,
    })),
    extensions: extensions.map((e) => ({
      previousEndDate: e.previousEndDate, previousReturnTime: e.previousReturnTime,
      newEndDate: e.newEndDate, newReturnTime: e.newReturnTime,
      additionalCost: toNum(e.additionalCost), extendedAt: e.extendedAt.toISOString(),
    })),
    returnChecklist,
    images: images.filter((i) => i.source === "inspection").map((i) => i.url),
    payments: paymentsList,
    payment: lastPayment ? { paidAt: lastPayment.paidAt, method: lastPayment.method, amountPaid: totalPaid } : undefined,
  };
}

// ─── Sequential reservation ID ────────────────────────────────────────────────

async function getNextReservationId(tenantId: string, tx: Transaction): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`);
  const result = await tx
    .insert(tenantReservationCounters)
    .values({ tenantId, lastIssuedId: 1 })
    .onConflictDoUpdate({
      target: tenantReservationCounters.tenantId,
      set: { lastIssuedId: sql`tenant_reservation_counters.last_issued_id + 1` },
    })
    .returning({ id: tenantReservationCounters.lastIssuedId });
  return String(result[0].id);
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCustomer(input: CustomerInput) {
  if (!input.firstName?.trim()) throw new Error("Customer first name is required");
  if (!input.lastName?.trim()) throw new Error("Customer last name is required");
  if (!input.email?.trim() || !isValidEmail(input.email)) throw new Error("Valid customer email is required");
  if (!input.phone?.trim() || input.phone.trim().length < 6) throw new Error("Valid customer phone is required");
  if (!input.licenseNumber?.trim()) throw new Error("Customer license number is required");
  if (!input.licenseExpiry?.trim()) throw new Error("Customer license expiry is required");
}

async function validateReservationExtras(extras: string[], tenantId: string) {
  const settings = await getTenantSettings(tenantId);
  const invalid = extras.filter((e) => !settings.extras.includes(e));
  if (invalid.length) throw new Error(`Invalid extras: ${invalid.join(", ")}`);
}

async function validateReservationLocations(pickupLocation: string, returnLocation: string, tenantId: string) {
  const settings = await getTenantSettings(tenantId);
  if (pickupLocation && !settings.locations.includes(pickupLocation)) throw new Error(`Invalid pickup location: ${pickupLocation}`);
  if (returnLocation && !settings.locations.includes(returnLocation)) throw new Error(`Invalid return location: ${returnLocation}`);
}

async function validateVehicleReservationConflict(
  vehicleId: string, startDate: string, endDate: string, pickupTime: string, returnTime: string,
  tenantId: string, excludeReservationId?: string
) {
  const periodStart = new Date(`${startDate}T${pickupTime}`).getTime();
  const periodEnd = new Date(`${endDate}T${returnTime}`).getTime();
  const all = await listReservations(tenantId);
  const conflict = all.find(
    (r) =>
      r.vehicleId === vehicleId &&
      r.id !== excludeReservationId &&
      RESERVATION_BLOCKING_STATUSES.includes(r.status) &&
      reservationBlocksPeriod(r, periodStart, periodEnd)
  );
  if (conflict) throw new Error(`Vehicle is already reserved during the extended period (reservation #${conflict.id})`);
}

function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(1, Math.ceil((end - start) / 86400000));
}

function calculateTotalCost(startDate: string, endDate: string, dailyRate: number): number {
  const days = rentalDays(startDate, endDate);
  return Math.round(days * dailyRate * 100) / 100;
}

function isVehicleReservable(status: Vehicle["status"]): boolean {
  return status === "available" || status === "rented";
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function listCustomers(tenantId: string): Promise<Customer[]> {
  const rows = await db.select().from(customers).where(eq(customers.tenantId, tenantId)).orderBy(desc(customers.createdAt));
  return Promise.all(rows.map(assembleCustomer));
}

export async function getCustomerById(id: string, tenantId: string): Promise<Customer | null> {
  const [row] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId))).limit(1);
  return row ? assembleCustomer(row) : null;
}

export async function createCustomer(input: CustomerInput, tenantId: string): Promise<Customer> {
  validateCustomer(input);

  const [dupByEmail] = await db.select({ id: customers.id }).from(customers)
    .where(and(eq(customers.tenantId, tenantId), sql`LOWER(${customers.email}) = LOWER(${input.email.trim()})`)).limit(1);
  const [dupByLicense] = await db.select({ id: customers.id }).from(customers)
    .where(and(eq(customers.tenantId, tenantId), sql`LOWER(${customers.licenseNumber}) = LOWER(${input.licenseNumber.trim()})`)).limit(1);
  if (dupByEmail || dupByLicense) throw new Error("A customer with this email or license number already exists");

  const id = `c_${randomUUID()}`;
  await db.insert(customers).values({
    id, tenantId,
    firstName: input.firstName.trim(), lastName: input.lastName.trim(),
    email: normalize(input.email), phone: input.phone.trim(),
    licenseNumber: input.licenseNumber.trim(), licenseExpiry: input.licenseExpiry.trim(),
    address: input.address?.trim() ?? "",
    verified: input.verified ?? true, blacklisted: false,
  });

  const imgs = (input.images ?? []).filter((u) => u?.trim());
  if (imgs.length) {
    await db.insert(customerImages).values(imgs.map((url, position) => ({ id: randomUUID(), customerId: id, url, position })));
  }

  return (await getCustomerById(id, tenantId))!;
}

export async function updateCustomer(id: string, input: CustomerUpdateInput, tenantId: string): Promise<Customer> {
  const existing = await getCustomerById(id, tenantId);
  if (!existing) throw new Error("Customer not found");
  await db.update(customers).set({
    ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
    ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
    ...(input.email !== undefined ? { email: normalize(input.email) } : {}),
    ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
    ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber.trim() } : {}),
    ...(input.licenseExpiry !== undefined ? { licenseExpiry: input.licenseExpiry.trim() } : {}),
    ...(input.address !== undefined ? { address: input.address.trim() } : {}),
    ...(input.verified !== undefined ? { verified: input.verified } : {}),
    ...(input.blacklisted !== undefined ? { blacklisted: input.blacklisted } : {}),
    ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
    updatedAt: new Date(),
  }).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  return (await getCustomerById(id, tenantId))!;
}

export async function updateCustomerImages(id: string, images: string[], tenantId: string): Promise<Customer> {
  const existing = await getCustomerById(id, tenantId);
  if (!existing) throw new Error("Customer not found");
  await db.delete(customerImages).where(eq(customerImages.customerId, id));
  const imgs = images.filter((u) => u?.trim());
  if (imgs.length) {
    await db.insert(customerImages).values(imgs.map((url, position) => ({ id: randomUUID(), customerId: id, url, position })));
  }
  return (await getCustomerById(id, tenantId))!;
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function listReservations(tenantId: string, filters?: ReservationListFilters): Promise<Reservation[]> {
  const rows = await db.select().from(reservations)
    .where(eq(reservations.tenantId, tenantId))
    .orderBy(desc(reservations.createdAt));
  let all = await Promise.all(rows.map((r) => assembleReservation(r)));

  if (!filters) return all;

  if (filters.status) all = all.filter((r) => r.status === filters.status);
  if (filters.dateFrom) all = all.filter((r) => r.startDate >= filters.dateFrom!);
  if (filters.dateTo) all = all.filter((r) => r.endDate <= filters.dateTo!);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    all = all.filter((r) =>
      r.customerName.toLowerCase().includes(q) ||
      r.vehicleName.toLowerCase().includes(q) ||
      r.vehiclePlate.toLowerCase().includes(q) ||
      r.id.includes(q)
    );
  }
  if (filters.overdue) {
    const now = Date.now();
    all = all.filter((r) => r.status === "active" && new Date(`${r.endDate}T${r.returnTime}`).getTime() < now);
  }
  if (filters.limit) all = all.slice(0, filters.limit);

  return all;
}

export async function listReservationsWithTotal(tenantId: string, filters?: ReservationListFilters): Promise<{ reservations: Reservation[]; total: number }> {
  const reservationList = await listReservations(tenantId, filters);
  return { reservations: reservationList, total: reservationList.length };
}

export async function getReservationById(id: string, tenantId: string): Promise<Reservation | null> {
  const [row] = await db.select().from(reservations)
    .where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId))).limit(1);
  return row ? assembleReservation(row) : null;
}

export async function createReservation(input: ReservationInput, tenantId: string): Promise<Reservation> {
  const vehicle = await getVehicleById(input.vehicleId, tenantId);
  if (!vehicle) throw new Error("Vehicle not found");
  if (!isVehicleReservable(vehicle.status)) throw new Error("Vehicle is not available");

  const customer = await getCustomerById(input.customerId, tenantId);
  if (!customer) throw new Error("Customer not found");
  if (customer.blacklisted) throw new Error("Customer is blacklisted");

  if (input.extras?.length) await validateReservationExtras(input.extras, tenantId);
  if (input.pickupLocation || input.returnLocation) {
    await validateReservationLocations(input.pickupLocation, input.returnLocation, tenantId);
  }

  const days = rentalDays(input.startDate, input.endDate);
  const tiers = await getEffectiveTiers(vehicle.id, vehicle.pricingTemplateId);
  const tierRate = resolveTier(tiers, days)?.dailyRate ?? vehicle.dailyRate;
  const dailyRate = input.dailyRate ?? tierRate;
  const totalCost = input.dailyRate != null
    ? Math.round(input.dailyRate * days * 100) / 100
    : calculateCost(days, tiers, vehicle.dailyRate);
  await validateVehicleReservationConflict(input.vehicleId, input.startDate, input.endDate, input.pickupTime, input.returnTime, tenantId);

  const reservation = await db.transaction(async (tx) => {
    const id = await getNextReservationId(tenantId, tx);
    const createdAt = input.createdAt ?? new Date().toISOString();

    await tx.insert(reservations).values({
      id, tenantId,
      customerId: customer.id, customerName: `${customer.firstName} ${customer.lastName}`,
      vehicleId: vehicle.id, vehicleName: `${vehicle.make} ${vehicle.model}`, vehiclePlate: vehicle.plate,
      startDate: input.startDate, pickupTime: input.pickupTime,
      endDate: input.endDate, returnTime: input.returnTime,
      status: input.status ?? "confirmed",
      dailyRate: String(dailyRate), totalCost: String(totalCost),
      pickupLocation: input.pickupLocation, returnLocation: input.returnLocation,
      notes: input.notes ?? "", createdAt,
    });

    if (input.extras?.length) {
      await tx.insert(reservationExtras).values(
        input.extras.map((extra, position) => ({ reservationId: id, tenantId, extra, position }))
      );
    }

    const imgs = (input.images ?? []).filter((u) => u?.trim());
    if (imgs.length) {
      await tx.insert(reservationImages).values(
        imgs.map((url, position) => ({ id: randomUUID(), reservationId: id, tenantId, url, position, source: "inspection" }))
      );
    }

    const [row] = await tx.select().from(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId))).limit(1);
    return assembleReservation(row, tx);
  });

  if (reservation.status === "active") {
    await updateVehicle(input.vehicleId, { status: "rented" }, tenantId);
  }

  return reservation;
}

export async function createPublicReservation(input: PublicBookingInput, tenantId: string): Promise<Reservation> {
  const vehicle = await getVehicleById(input.vehicleId, tenantId);
  if (!vehicle) throw new Error("Vehicle not found");
  if (!isVehicleReservable(vehicle.status)) throw new Error("Vehicle is not available");

  const all = await listReservations(tenantId);
  const periodStart = new Date(`${input.startDate}T09:00`).getTime();
  const periodEnd = new Date(`${input.endDate}T09:00`).getTime();
  const conflict = all.find(
    (r) => r.vehicleId === input.vehicleId && RESERVATION_BLOCKING_STATUSES.includes(r.status) && reservationBlocksPeriod(r, periodStart, periodEnd)
  );
  if (conflict) throw new Error("Vehicle is not available for the selected period");

  let customer = await (async () => {
    const [byEmail] = await db.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.tenantId, tenantId), sql`LOWER(${customers.email}) = LOWER(${input.customer.email})`)).limit(1);
    if (byEmail) return getCustomerById(byEmail.id, tenantId);
    return createCustomer({ ...input.customer, verified: false }, tenantId);
  })();

  if (!customer) throw new Error("Could not resolve customer");
  if (customer.blacklisted) throw new Error("Customer is blacklisted");

  const days = rentalDays(input.startDate, input.endDate);
  const tiers = await getEffectiveTiers(vehicle.id, vehicle.pricingTemplateId);
  const dailyRate = resolveTier(tiers, days)?.dailyRate ?? vehicle.dailyRate;
  const totalCost = calculateCost(days, tiers, vehicle.dailyRate);

  return db.transaction(async (tx) => {
    const id = await getNextReservationId(tenantId, tx);
    const createdAt = new Date().toISOString();

    await tx.insert(reservations).values({
      id, tenantId,
      customerId: customer!.id, customerName: `${input.customer.firstName} ${input.customer.lastName}`,
      vehicleId: vehicle.id, vehicleName: `${vehicle.make} ${vehicle.model}`, vehiclePlate: vehicle.plate,
      startDate: input.startDate, pickupTime: "09:00",
      endDate: input.endDate, returnTime: "09:00",
      status: "pending",
      dailyRate: String(dailyRate), totalCost: String(totalCost),
      pickupLocation: input.pickupLocation, returnLocation: input.returnLocation,
      notes: "", createdAt,
    });

    if (input.extras?.length) {
      await tx.insert(reservationExtras).values(
        input.extras.map((extra, position) => ({ reservationId: id, tenantId, extra, position }))
      );
    }

    const [row] = await tx.select().from(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId))).limit(1);
    return assembleReservation(row, tx);
  });
}

export async function updateReservationStatus(
  id: string, input: ReservationStatusUpdate, tenantId: string
): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");

  if (input.status === "cancelled") {
    if (!["pending", "confirmed", "active"].includes(reservation.status)) {
      throw new Error("Only pending, confirmed, or active reservations can be cancelled");
    }
  }

  await db.update(reservations).set({
    status: input.status,
    ...(input.cancellationReason !== undefined ? { cancellationReason: input.cancellationReason } : {}),
    ...(input.adjustedCost !== undefined ? { adjustedCost: String(input.adjustedCost) } : {}),
    updatedAt: new Date(),
  }).where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)));

  if (input.status === "active") {
    const vehicle = await getVehicleById(reservation.vehicleId, tenantId);
    if (vehicle) await updateVehicle(reservation.vehicleId, { status: "rented" }, tenantId);
  }

  if (input.status === "cancelled") {
    const vehicle = await getVehicleById(reservation.vehicleId, tenantId);
    if (vehicle?.status === "rented") await updateVehicle(reservation.vehicleId, { status: "available" }, tenantId);
  }

  return (await getReservationById(id, tenantId))!;
}

export async function extendReservation(id: string, input: ExtendReservationInput, tenantId: string): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Only active reservations can be extended");
  const currentReturnAt = new Date(`${reservation.endDate}T${reservation.returnTime}`).getTime();
  const nextReturnAt = new Date(`${input.newEndDate}T${input.newReturnTime}`).getTime();
  if (!Number.isFinite(nextReturnAt) || nextReturnAt <= currentReturnAt) {
    throw new Error("New return date must be after the current return date");
  }

  await validateVehicleReservationConflict(
    reservation.vehicleId, reservation.startDate, input.newEndDate, reservation.pickupTime, input.newReturnTime, tenantId, id
  );

  const oldDays = Math.max(1, Math.ceil((new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime()) / 86400000));
  const newDays = Math.max(1, Math.ceil((new Date(input.newEndDate).getTime() - new Date(reservation.startDate).getTime()) / 86400000));
  const additionalCost = Math.max(0, Math.round((newDays - oldDays) * reservation.dailyRate * 100) / 100);
  const newTotalCost = Math.round((reservation.totalCost + additionalCost) * 100) / 100;

  await db.transaction(async (tx) => {
    await tx.update(reservations).set({
      endDate: input.newEndDate, returnTime: input.newReturnTime,
      totalCost: String(newTotalCost), updatedAt: new Date(),
    }).where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)));

    await tx.insert(reservationExtensions).values({
      id: randomUUID(), reservationId: id, tenantId,
      previousEndDate: reservation.endDate, previousReturnTime: reservation.returnTime,
      newEndDate: input.newEndDate, newReturnTime: input.newReturnTime,
      additionalCost: String(additionalCost),
    });
  });

  return (await getReservationById(id, tenantId))!;
}

export async function swapReservationVehicle(id: string, input: VehicleSwapInput, tenantId: string): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Vehicle swap is only allowed for active reservations");

  const toVehicle = await getVehicleById(input.toVehicleId, tenantId);
  if (!toVehicle) throw new Error("Target vehicle not found");
  if (toVehicle.status !== "available") throw new Error("Replacement vehicle is not available");

  await db.transaction(async (tx) => {
    await tx.insert(vehicleSwaps).values({
      id: randomUUID(), reservationId: id, tenantId,
      fromVehicleId: reservation.vehicleId, fromVehicleName: reservation.vehicleName, fromVehiclePlate: reservation.vehiclePlate,
      toVehicleId: input.toVehicleId, toVehicleName: input.toVehicleName, toVehiclePlate: input.toVehiclePlate,
      reason: input.reason, reasonType: input.reasonType,
      fromVehicleCondition: input.fromVehicleCondition ?? null,
    });

    await tx.update(reservations).set({
      vehicleId: input.toVehicleId, vehicleName: input.toVehicleName, vehiclePlate: input.toVehiclePlate,
      updatedAt: new Date(),
    }).where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)));
  });

  const outgoingStatus =
    input.reasonType === "breakdown" || input.reasonType === "accident"
      ? "maintenance"
      : "available";
  await updateVehicle(reservation.vehicleId, { status: outgoingStatus }, tenantId);
  await updateVehicle(input.toVehicleId, { status: "rented" }, tenantId);

  return (await getReservationById(id, tenantId))!;
}

export async function completeReservationReturn(id: string, input: ReturnChecklistInput, tenantId: string): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status !== "active") throw new Error("Only active reservations can be returned");

  const extraCharges = input.extraCharges ?? 0;
  const newTotalCost = Math.round((reservation.totalCost + extraCharges) * 100) / 100;

  await db.transaction(async (tx) => {
    await tx.update(reservations).set({
      status: "completed", totalCost: String(newTotalCost), updatedAt: new Date(),
    }).where(and(eq(reservations.id, id), eq(reservations.tenantId, tenantId)));

    await tx.insert(returnChecklists).values({
      reservationId: id, tenantId,
      returnMileage: input.returnMileage, fuelLevel: input.fuelLevel,
      hasDamage: input.hasDamage, damageDescription: input.damageDescription ?? null,
      extraCharges: String(extraCharges), notes: input.notes ?? null,
    });

    if (input.returnPhotos?.length) {
      await tx.insert(reservationImages).values(
        input.returnPhotos.map((url, position) => ({ id: randomUUID(), reservationId: id, tenantId, url, position, source: "return" }))
      );
    }
  });

  await updateVehicle(
    reservation.vehicleId,
    { status: input.hasDamage ? "maintenance" : "available", mileage: input.returnMileage },
    tenantId
  );
  if (input.returnMileage) {
    await appendVehicleMaintenanceLog(reservation.vehicleId, {
      date: new Date().toISOString().slice(0, 10),
      mileage: input.returnMileage, type: "return",
      notes: `Returned from reservation #${id}`,
    }, tenantId);
  }

  await db.update(customers).set({
    totalRentals: sql`${customers.totalRentals} + 1`,
    totalSpent: sql`${customers.totalSpent} + ${String(reservation.totalCost)}`,
    updatedAt: new Date(),
  }).where(eq(customers.id, reservation.customerId));

  return (await getReservationById(id, tenantId))!;
}

export async function markReservationPaid(id: string, input: MarkReservationPaidInput, tenantId: string): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");
  if (reservation.status === "cancelled") throw new Error("Cannot mark a cancelled reservation as paid");
  const outstanding = getReservationOutstandingAmount(reservation);
  if (outstanding <= 0) throw new Error("Reservation is already marked as paid");

  await db.insert(reservationPayments).values({
    id: randomUUID(), reservationId: id, tenantId,
    method: input.method, amount: String(outstanding),
  });

  return (await getReservationById(id, tenantId))!;
}

export async function updateReservationImages(id: string, images: string[], tenantId: string): Promise<Reservation> {
  const reservation = await getReservationById(id, tenantId);
  if (!reservation) throw new Error("Reservation not found");

  await db.delete(reservationImages).where(
    and(eq(reservationImages.reservationId, id), eq(reservationImages.tenantId, tenantId), eq(reservationImages.source, "inspection"))
  );
  const imgs = images.filter((u) => u?.trim());
  if (imgs.length) {
    await db.insert(reservationImages).values(
      imgs.map((url, position) => ({ id: randomUUID(), reservationId: id, tenantId, url, position, source: "inspection" }))
    );
  }

  return (await getReservationById(id, tenantId))!;
}
