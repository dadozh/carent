import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Use in-memory DB for every test file
process.env.CARENT_DB_PATH = ":memory:";

// Dynamic import after env is set
async function getModule() {
  const mod = await import("@/lib/vehicle-db");
  return mod;
}

describe("vehicle-db — tenant isolation", () => {
  const T1 = "tenant_a";
  const T2 = "tenant_b";

  beforeEach(async () => {
    const { __closeDb } = await getModule();
    __closeDb();
  });

  afterEach(async () => {
    const { __closeDb } = await getModule();
    __closeDb();
  });

  function vehicleInput(overrides = {}) {
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
      images: [],
      ...overrides,
    };
  }

  it("creates a vehicle scoped to the given tenant", async () => {
    const { createVehicle, listVehicles } = await getModule();
    createVehicle(vehicleInput(), T1);
    const t1Vehicles = listVehicles(T1);
    expect(t1Vehicles).toHaveLength(1);
    expect(t1Vehicles[0].make).toBe("Toyota");
  });

  it("tenant A cannot see tenant B vehicles", async () => {
    const { createVehicle, listVehicles } = await getModule();
    createVehicle(vehicleInput({ plate: "T1-001" }), T1);
    createVehicle(vehicleInput({ plate: "T2-001" }), T2);

    expect(listVehicles(T1)).toHaveLength(1);
    expect(listVehicles(T1)[0].plate).toBe("T1-001");

    expect(listVehicles(T2)).toHaveLength(1);
    expect(listVehicles(T2)[0].plate).toBe("T2-001");
  });

  it("getVehicleById returns null for wrong tenant", async () => {
    const { createVehicle, getVehicleById } = await getModule();
    const v = createVehicle(vehicleInput(), T1);
    expect(getVehicleById(v.id, T1)).not.toBeNull();
    expect(getVehicleById(v.id, T2)).toBeNull();
  });

  it("updateVehicle cannot update another tenant's vehicle", async () => {
    const { createVehicle, updateVehicle, getVehicleById } = await getModule();
    const v = createVehicle(vehicleInput({ dailyRate: 35 }), T1);

    const result = updateVehicle(v.id, { dailyRate: 99 }, T2);
    expect(result).toBeNull();

    // Original unchanged
    const original = getVehicleById(v.id, T1);
    expect(original?.dailyRate).toBe(35);
  });

  it("updateVehicle works for own tenant", async () => {
    const { createVehicle, updateVehicle, getVehicleById } = await getModule();
    const v = createVehicle(vehicleInput({ dailyRate: 35 }), T1);
    updateVehicle(v.id, { dailyRate: 50 }, T1);
    expect(getVehicleById(v.id, T1)?.dailyRate).toBe(50);
  });

  it("counts billable vehicles for a month using creation and archive dates", async () => {
    const {
      __setVehicleLifecycleForTest,
      countBillableVehiclesForMonth,
      createVehicle,
      updateVehicle,
    } = await getModule();

    const janOnly = createVehicle(vehicleInput({ plate: "JAN-ONLY" }), T1);
    __setVehicleLifecycleForTest(janOnly.id, T1, {
      createdAt: "2026-01-05 10:00:00",
      archivedAt: "2026-01-20 11:00:00",
    });

    const fullRange = createVehicle(vehicleInput({ plate: "FULL-RANGE" }), T1);
    __setVehicleLifecycleForTest(fullRange.id, T1, {
      createdAt: "2025-12-15 09:00:00",
    });

    const futureCar = createVehicle(vehicleInput({ plate: "FUTURE-CAR" }), T1);
    __setVehicleLifecycleForTest(futureCar.id, T1, {
      createdAt: "2026-02-01 08:00:00",
    });

    const otherTenant = createVehicle(vehicleInput({ plate: "OTHER-TENANT" }), T2);
    __setVehicleLifecycleForTest(otherTenant.id, T2, {
      createdAt: "2025-12-01 08:00:00",
    });

    expect(countBillableVehiclesForMonth(T1, "2026-01")).toBe(2);
    expect(countBillableVehiclesForMonth(T1, "2026-02")).toBe(2);
    expect(countBillableVehiclesForMonth(T2, "2026-01")).toBe(1);

    updateVehicle(fullRange.id, { status: "retired" }, T1);
    __setVehicleLifecycleForTest(fullRange.id, T1, {
      archivedAt: "2026-03-10 12:00:00",
    });

    expect(countBillableVehiclesForMonth(T1, "2026-03")).toBe(2);
    expect(countBillableVehiclesForMonth(T1, "2026-04")).toBe(1);
  });
});
