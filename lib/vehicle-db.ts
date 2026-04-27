import { randomUUID } from "node:crypto";
import { and, count as sqlCount, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vehicleImages, vehicleMaintenanceLogs, vehicles } from "@/lib/db/schema";
import { getEffectiveTiers, setVehiclePricingTiers } from "@/lib/pricing-db";
import type { PricingTier } from "@/lib/pricing";
import type { Vehicle } from "@/lib/mock-data";

type VehicleInput = Omit<Vehicle, "id" | "maintenanceLog" | "rentalHistory"> & {
  customTiers?: PricingTier[];
};

function toNum(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? "0")) || 0;
}

async function assembleVehicle(
  row: typeof vehicles.$inferSelect
): Promise<Vehicle> {
  const [imgRows, logRows, pricingTiers] = await Promise.all([
    db.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, row.id)).orderBy(vehicleImages.position),
    db.select().from(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.vehicleId, row.id)).orderBy(sql`${vehicleMaintenanceLogs.createdAt} DESC`),
    getEffectiveTiers(row.id, row.pricingTemplateId),
  ]);
  const images = imgRows.map((i) => i.url);
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    trim: row.trim ?? undefined,
    year: row.year,
    category: row.category as Vehicle["category"],
    plate: row.plate,
    vin: row.vin ?? undefined,
    color: row.color,
    mileage: row.mileage,
    dailyRate: toNum(row.dailyRate),
    pricingTemplateId: row.pricingTemplateId ?? null,
    pricingTiers,
    status: row.status as Vehicle["status"],
    location: row.location,
    fuelType: row.fuelType,
    transmission: row.transmission,
    seats: row.seats,
    luggageCount: row.luggageCount,
    image: row.image || images[0] || "",
    images,
    lastService: row.lastService,
    nextService: row.nextService,
    maintenanceLog: logRows.map((l) => ({
      date: l.date,
      mileage: l.mileage ?? undefined,
      type: l.type,
      cost: toNum(l.cost),
      notes: l.notes,
    })),
    rentalHistory: [],
  };
}

export async function listVehicles(tenantId: string): Promise<Vehicle[]> {
  const rows = await db.select().from(vehicles)
    .where(eq(vehicles.tenantId, tenantId))
    .orderBy(sql`${vehicles.createdAt} DESC`);
  return Promise.all(rows.map(assembleVehicle));
}

export async function getVehicleById(id: string, tenantId: string): Promise<Vehicle | null> {
  const [row] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId))).limit(1);
  return row ? assembleVehicle(row) : null;
}

export async function createVehicle(input: VehicleInput, tenantId: string): Promise<Vehicle> {
  const id = `v_${randomUUID()}`;
  const archivedAt = input.status === "retired" ? new Date() : null;
  await db.insert(vehicles).values({
    id, tenantId,
    make: input.make, model: input.model, trim: input.trim ?? null,
    year: input.year, category: input.category, plate: input.plate,
    vin: input.vin ?? null, color: input.color, mileage: input.mileage,
    dailyRate: String(input.dailyRate), status: input.status,
    pricingTemplateId: input.pricingTemplateId ?? null,
    location: input.location, fuelType: input.fuelType, transmission: input.transmission,
    seats: input.seats, luggageCount: input.luggageCount,
    image: input.image || "", lastService: input.lastService, nextService: input.nextService,
    archivedAt,
  });
  if (!input.pricingTemplateId && input.customTiers) {
    await setVehiclePricingTiers(id, tenantId, input.customTiers);
  }

  const imgs = [input.image, ...input.images].filter((u) => u?.trim());
  const seen = new Set<string>();
  const uniqueImgs = imgs.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true; });
  if (uniqueImgs.length) {
    await db.insert(vehicleImages).values(
      uniqueImgs.map((url, position) => ({ id: randomUUID(), vehicleId: id, url, position }))
    );
  }

  return (await getVehicleById(id, tenantId))!;
}

type VehicleUpdate = Partial<Vehicle> & { customTiers?: PricingTier[] };

export async function updateVehicle(id: string, updates: VehicleUpdate, tenantId: string): Promise<Vehicle | null> {
  const existing = await getVehicleById(id, tenantId);
  if (!existing) return null;

  const next = { ...existing, ...updates, id };
  const archivedAt =
    existing.status !== "retired" && next.status === "retired" ? new Date()
    : existing.status === "retired" && next.status !== "retired" ? null
    : undefined;

  await db.update(vehicles).set({
    make: next.make, model: next.model, trim: next.trim ?? null,
    year: next.year, category: next.category, plate: next.plate,
    vin: next.vin ?? null, color: next.color, mileage: next.mileage,
    dailyRate: String(next.dailyRate), status: next.status,
    pricingTemplateId: next.pricingTemplateId ?? null,
    location: next.location, fuelType: next.fuelType, transmission: next.transmission,
    seats: next.seats, luggageCount: next.luggageCount,
    image: next.image || "", lastService: next.lastService, nextService: next.nextService,
    ...(archivedAt !== undefined ? { archivedAt } : {}),
    updatedAt: new Date(),
  }).where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId)));

  if (updates.customTiers !== undefined || updates.pricingTemplateId !== undefined) {
    if (!next.pricingTemplateId && updates.customTiers) {
      await setVehiclePricingTiers(id, tenantId, updates.customTiers);
    } else if (!next.pricingTemplateId) {
      await setVehiclePricingTiers(id, tenantId, []);
    }
  }

  if (updates.images !== undefined) {
    await db.delete(vehicleImages).where(eq(vehicleImages.vehicleId, id));
    const imgs = [next.image, ...next.images].filter((u) => u?.trim());
    const seen = new Set<string>();
    const uniqueImgs = imgs.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true; });
    if (uniqueImgs.length) {
      await db.insert(vehicleImages).values(
        uniqueImgs.map((url, position) => ({ id: randomUUID(), vehicleId: id, url, position }))
      );
    }
  }

  return getVehicleById(id, tenantId);
}

export async function appendVehicleMaintenanceLog(
  id: string,
  entry: { date?: string; mileage?: number; type: string; cost?: number; notes?: string },
  tenantId: string
): Promise<Vehicle | null> {
  const vehicle = await getVehicleById(id, tenantId);
  if (!vehicle) return null;
  await db.insert(vehicleMaintenanceLogs).values({
    id: randomUUID(),
    vehicleId: id,
    date: entry.date ?? new Date().toISOString().slice(0, 10),
    mileage: entry.mileage ?? null,
    type: entry.type,
    cost: String(entry.cost ?? 0),
    notes: entry.notes ?? "",
  });
  return getVehicleById(id, tenantId);
}

export async function countBillableVehiclesForMonth(tenantId: string, billingMonth: string): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) throw new Error("Billing month must use YYYY-MM format");
  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) throw new Error("Billing month is invalid");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  const periodStart = new Date(`${year}-${mm}-01`);
  const periodEnd = new Date(`${year}-${mm}-${String(lastDay).padStart(2, "0")}`);

  const [row] = await db.select({ total: sqlCount() }).from(vehicles).where(
    and(
      eq(vehicles.tenantId, tenantId),
      lte(vehicles.createdAt, periodEnd),
      or(isNull(vehicles.archivedAt), gte(vehicles.archivedAt, periodStart))
    )
  );
  return row?.total ?? 0;
}
