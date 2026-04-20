import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Integration tests requiring a real PostgreSQL database.
// Set DATABASE_URL to run them.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

async function getModule() {
  return import("@/lib/vehicle-db");
}

async function getDb() {
  return import("@/lib/db");
}

const T1 = "test_vehicle_a";
const T2 = "test_vehicle_b";

async function cleanupTestTenants() {
  if (!hasDb) return;
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`DELETE FROM vehicle_images WHERE vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM vehicle_maintenance_logs WHERE vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM vehicles WHERE tenant_id IN (${T1}, ${T2})`);
}

function vehicleInput(overrides: Record<string, unknown> = {}) {
  return {
    make: "Toyota",
    model: "Yaris",
    year: 2022,
    plate: "NS-001-AA",
    color: "White",
    status: "available" as const,
    category: "compact" as const,
    transmission: "Manual" as const,
    fuelType: "Gasoline" as const,
    seats: 5,
    luggageCount: 2,
    dailyRate: 35,
    mileage: 10000,
    location: "Airport",
    lastService: "2025-01-01",
    nextService: "2026-01-01",
    image: "",
    images: [] as string[],
    ...overrides,
  };
}

describeIfDb("vehicle-db — tenant isolation", () => {
  beforeEach(cleanupTestTenants);
  afterEach(cleanupTestTenants);

  it("creates a vehicle scoped to the given tenant", async () => {
    const { createVehicle, listVehicles } = await getModule();
    await createVehicle(vehicleInput(), T1);
    const t1Vehicles = await listVehicles(T1);
    expect(t1Vehicles).toHaveLength(1);
    expect(t1Vehicles[0].make).toBe("Toyota");
  });

  it("tenant A cannot see tenant B vehicles", async () => {
    const { createVehicle, listVehicles } = await getModule();
    await createVehicle(vehicleInput({ plate: "T1-001" }), T1);
    await createVehicle(vehicleInput({ plate: "T2-001" }), T2);

    const t1 = await listVehicles(T1);
    const t2 = await listVehicles(T2);
    expect(t1).toHaveLength(1);
    expect(t1[0].plate).toBe("T1-001");
    expect(t2).toHaveLength(1);
    expect(t2[0].plate).toBe("T2-001");
  });

  it("getVehicleById returns null for wrong tenant", async () => {
    const { createVehicle, getVehicleById } = await getModule();
    const v = await createVehicle(vehicleInput(), T1);
    expect(await getVehicleById(v.id, T1)).not.toBeNull();
    expect(await getVehicleById(v.id, T2)).toBeNull();
  });

  it("updateVehicle cannot update another tenant's vehicle", async () => {
    const { createVehicle, updateVehicle, getVehicleById } = await getModule();
    const v = await createVehicle(vehicleInput({ dailyRate: 35 }), T1);

    const result = await updateVehicle(v.id, { dailyRate: 99 }, T2);
    expect(result).toBeNull();

    const original = await getVehicleById(v.id, T1);
    expect(original?.dailyRate).toBe(35);
  });

  it("updateVehicle works for own tenant", async () => {
    const { createVehicle, updateVehicle, getVehicleById } = await getModule();
    const v = await createVehicle(vehicleInput({ dailyRate: 35 }), T1);
    await updateVehicle(v.id, { dailyRate: 50 }, T1);
    expect((await getVehicleById(v.id, T1))?.dailyRate).toBe(50);
  });

  it("counts billable vehicles for a month using creation and archive dates", async () => {
    const { countBillableVehiclesForMonth, createVehicle } = await getModule();
    const { db } = await getDb();
    const { sql } = await import("drizzle-orm");

    const janOnly = await createVehicle(vehicleInput({ plate: "JAN-ONLY" }), T1);
    await db.execute(sql`UPDATE vehicles SET created_at = '2026-01-05 10:00:00+00', archived_at = '2026-01-20 11:00:00+00' WHERE id = ${janOnly.id}`);

    const fullRange = await createVehicle(vehicleInput({ plate: "FULL-RANGE" }), T1);
    await db.execute(sql`UPDATE vehicles SET created_at = '2025-12-15 09:00:00+00' WHERE id = ${fullRange.id}`);

    const futureCar = await createVehicle(vehicleInput({ plate: "FUTURE-CAR" }), T1);
    await db.execute(sql`UPDATE vehicles SET created_at = '2026-02-01 08:00:00+00' WHERE id = ${futureCar.id}`);

    const otherTenant = await createVehicle(vehicleInput({ plate: "OTHER-TENANT" }), T2);
    await db.execute(sql`UPDATE vehicles SET created_at = '2025-12-01 08:00:00+00' WHERE id = ${otherTenant.id}`);

    expect(await countBillableVehiclesForMonth(T1, "2026-01")).toBe(2);
    expect(await countBillableVehiclesForMonth(T1, "2026-02")).toBe(2);
    expect(await countBillableVehiclesForMonth(T2, "2026-01")).toBe(1);

    await db.execute(sql`UPDATE vehicles SET archived_at = '2026-03-10 12:00:00+00' WHERE id = ${fullRange.id}`);
    expect(await countBillableVehiclesForMonth(T1, "2026-03")).toBe(2);
    expect(await countBillableVehiclesForMonth(T1, "2026-04")).toBe(1);
  });
});
