import { describe, it, expect, beforeEach, afterEach } from "vitest";

// These are integration tests that require a real PostgreSQL database.
// Set DATABASE_URL to run them.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

async function getVehicleDb() {
  return import("@/lib/vehicle-db");
}

async function getRentalDb() {
  return import("@/lib/rental-db");
}

async function getAuthDb() {
  return import("@/lib/auth-db");
}

async function getDb() {
  return import("@/lib/db");
}

const T1 = "test_tenant_a";
const T2 = "test_tenant_b";

async function cleanupTestTenants() {
  if (!hasDb) return;
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  // Delete in dependency order
  await db.execute(sql`DELETE FROM return_checklists WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservation_images WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservation_payments WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservation_extensions WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM vehicle_swaps WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservation_extras WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservations WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenant_reservation_counters WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM customer_images WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM customers WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM vehicle_images WHERE vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM vehicle_maintenance_logs WHERE vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM vehicles WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenant_settings WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM users WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenants WHERE id IN (${T1}, ${T2})`);
}

async function ensureTestTenants() {
  if (!hasDb) return;
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    INSERT INTO tenants (id, name, slug, plan, active)
    VALUES
      (${T1}, 'Test Tenant A', 'test-tenant-a', 'trial', true),
      (${T2}, 'Test Tenant B', 'test-tenant-b', 'trial', true)
    ON CONFLICT (id) DO NOTHING
  `);
}

function customerInput(overrides: Record<string, string> = {}) {
  return {
    firstName: "Ana",
    lastName: "Jovic",
    email: "ana@example.com",
    phone: "+381601234567",
    licenseNumber: "LIC-001",
    licenseExpiry: "2030-12-31",
    address: "Novi Sad",
    nationality: "RS",
    dateOfBirth: "1990-01-01",
    ...overrides,
  };
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

function reservationInput(customerId: string, vehicleId: string) {
  return {
    customerId,
    vehicleId,
    startDate: "2030-06-01",
    endDate: "2030-06-05",
    pickupTime: "10:00",
    returnTime: "10:00",
    pickupLocation: "Airport",
    returnLocation: "Airport",
    extras: [] as string[],
    status: "confirmed" as const,
    notes: "",
  };
}

describeIfDb("rental-db — customers", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  it("creates a customer scoped to tenant", async () => {
    const { createCustomer, listCustomers } = await getRentalDb();
    await createCustomer(customerInput(), T1);
    expect(await listCustomers(T1)).toHaveLength(1);
    expect(await listCustomers(T2)).toHaveLength(0);
  });

  it("getCustomerById returns null for wrong tenant", async () => {
    const { createCustomer, getCustomerById } = await getRentalDb();
    const c = await createCustomer(customerInput(), T1);
    expect(await getCustomerById(c.id, T1)).not.toBeNull();
    expect(await getCustomerById(c.id, T2)).toBeNull();
  });

  it("duplicate check is per-tenant — same email allowed in different tenants", async () => {
    const { createCustomer } = await getRentalDb();
    await createCustomer(customerInput(), T1);
    await expect(createCustomer(customerInput(), T2)).resolves.toBeDefined();
  });

  it("duplicate check blocks same email within same tenant", async () => {
    const { createCustomer } = await getRentalDb();
    await createCustomer(customerInput(), T1);
    await expect(createCustomer(customerInput(), T1)).rejects.toThrow("already exists");
  });

  it("updateCustomerImages throws for wrong tenant", async () => {
    const { createCustomer, updateCustomerImages } = await getRentalDb();
    const c = await createCustomer(customerInput(), T1);
    await expect(updateCustomerImages(c.id, ["img.jpg"], T2)).rejects.toThrow("Customer not found");
  });
});

describeIfDb("rental-db — reservations", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  async function seedForTenant(tenantId: string, plate = "NS-100") {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();

    const vehicle = await createVehicle(vehicleInput({ plate }), tenantId);
    const customer = await createCustomer(
      customerInput({ email: `${tenantId}@example.com`, licenseNumber: `LIC-${tenantId}` }),
      tenantId
    );
    const reservation = await createReservation(reservationInput(customer.id, vehicle.id), tenantId);
    return { vehicle, customer, reservation };
  }

  it("listReservations is scoped to tenant", async () => {
    const { listReservations } = await getRentalDb();
    await seedForTenant(T1, "T1-PLATE");
    await seedForTenant(T2, "T2-PLATE");
    expect(await listReservations(T1)).toHaveLength(1);
    expect(await listReservations(T2)).toHaveLength(1);
  });

  it("getReservationById returns null for wrong tenant", async () => {
    const { getReservationById } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-2");
    expect(await getReservationById(reservation.id, T1)).not.toBeNull();
    expect(await getReservationById(reservation.id, T2)).toBeNull();
  });

  it("updateReservationStatus throws for wrong tenant", async () => {
    const { updateReservationStatus } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-3");
    await expect(
      updateReservationStatus(reservation.id, { status: "cancelled" }, T2)
    ).rejects.toThrow("Reservation not found");
  });

  it("updateReservationStatus cancels own tenant's reservation", async () => {
    const { updateReservationStatus } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-4");
    const updated = await updateReservationStatus(reservation.id, { status: "cancelled" }, T1);
    expect(updated.status).toBe("cancelled");
  });

  it("reservation IDs are independent per tenant", async () => {
    const { listReservations } = await getRentalDb();
    await seedForTenant(T1, "T1-P5");
    await seedForTenant(T2, "T2-P5");
    const [r1] = await listReservations(T1);
    const [r2] = await listReservations(T2);
    expect(r1.id).toBe("1");
    expect(r2.id).toBe("1");
  });

  it("vehicle not found across tenants during createReservation", async () => {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();

    const vehicle = await createVehicle(vehicleInput({ plate: "X-001" }), T1);
    const customer = await createCustomer(
      customerInput({ email: "cross@example.com", licenseNumber: "LIC-CROSS" }),
      T2
    );

    await expect(
      createReservation(reservationInput(customer.id, vehicle.id), T2)
    ).rejects.toThrow("Vehicle not found");
  });

  it("reservation can override daily rate without changing vehicle pricing", async () => {
    const { createReservation, createCustomer } = await getRentalDb();
    const { createVehicle, getVehicleById } = await getVehicleDb();

    const vehicle = await createVehicle(vehicleInput({ plate: "RATE-1", dailyRate: 35 }), T1);
    const customer = await createCustomer(
      customerInput({ email: "rate@example.com", licenseNumber: "LIC-RATE" }),
      T1
    );

    const reservation = await createReservation({
      ...reservationInput(customer.id, vehicle.id),
      dailyRate: 49,
    }, T1);

    expect(reservation.dailyRate).toBe(49);
    expect(reservation.totalCost).toBe(196);
    expect((await getVehicleById(vehicle.id, T1))?.dailyRate).toBe(35);
  });

  it("public booking creates a pending reservation in the correct tenant", async () => {
    const { createPublicReservation, listReservations } = await getRentalDb();
    const { vehicle } = await seedForTenant(T1, "PUB-T1");

    const reservation = await createPublicReservation({
      vehicleId: vehicle.id,
      startDate: "2030-07-01",
      endDate: "2030-07-05",
      pickupLocation: "Airport",
      returnLocation: "Airport",
      extras: [],
      customer: {
        firstName: "Public",
        lastName: "Customer",
        email: "public@example.com",
        phone: "+381601111111",
        licenseNumber: "LIC-PUBLIC",
        licenseExpiry: "2031-12-31",
        address: "Novi Sad",
      },
    }, T1);

    expect(reservation.status).toBe("pending");
    expect(await listReservations(T1)).toHaveLength(2);
    expect(await listReservations(T2)).toHaveLength(0);
  });

  it("public booking cannot book a vehicle from another tenant", async () => {
    const { createPublicReservation } = await getRentalDb();
    const { vehicle } = await seedForTenant(T1, "PUB-T2");

    await expect(
      createPublicReservation({
        vehicleId: vehicle.id,
        startDate: "2030-08-01",
        endDate: "2030-08-04",
        pickupLocation: "Airport",
        returnLocation: "Airport",
        extras: [],
        customer: {
          firstName: "Cross",
          lastName: "Tenant",
          email: "cross@example.com",
          phone: "+381602222222",
          licenseNumber: "LIC-CROSS-PUBLIC",
          licenseExpiry: "2031-12-31",
          address: "Belgrade",
        },
      }, T2)
    ).rejects.toThrow("Vehicle not found");
  });
});

describeIfDb("rental-db — vehicle swap enhancements", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  async function seedActiveReservation(tenantId: string, plate = "SWAP-001") {
    const { createVehicle, getVehicleById } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate }), tenantId);
    const customer = await createCustomer(customerInput({ email: `${tenantId}@swap.com`, licenseNumber: `LIC-SWAP-${plate}` }), tenantId);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "active" as const }, tenantId);
    return { vehicle, customer, reservation, getVehicleById };
  }

  it("breakdown swap sets outgoing vehicle to maintenance and incoming to rented", async () => {
    const { swapReservationVehicle } = await getRentalDb();
    const { createVehicle, getVehicleById } = await getVehicleDb();
    const { vehicle: oldVehicle, reservation } = await seedActiveReservation(T1, "OLD-001");
    const newVehicle = await createVehicle(vehicleInput({ plate: "NEW-001" }), T1);

    await swapReservationVehicle(reservation.id, {
      toVehicleId: newVehicle.id,
      toVehicleName: `${newVehicle.make} ${newVehicle.model}`,
      toVehiclePlate: newVehicle.plate,
      reason: "Engine failure",
      reasonType: "breakdown",
      fromVehicleCondition: "Engine seized, towed",
    }, T1);

    expect((await getVehicleById(oldVehicle.id, T1))?.status).toBe("maintenance");
    expect((await getVehicleById(newVehicle.id, T1))?.status).toBe("rented");
  });

  it("accident swap sets outgoing vehicle to maintenance", async () => {
    const { swapReservationVehicle } = await getRentalDb();
    const { createVehicle, getVehicleById } = await getVehicleDb();
    const { vehicle: oldVehicle, reservation } = await seedActiveReservation(T1, "OLD-002");
    const newVehicle = await createVehicle(vehicleInput({ plate: "NEW-002" }), T1);

    await swapReservationVehicle(reservation.id, {
      toVehicleId: newVehicle.id,
      toVehicleName: `${newVehicle.make} ${newVehicle.model}`,
      toVehiclePlate: newVehicle.plate,
      reason: "Front collision",
      reasonType: "accident",
    }, T1);

    expect((await getVehicleById(oldVehicle.id, T1))?.status).toBe("maintenance");
    expect((await getVehicleById(newVehicle.id, T1))?.status).toBe("rented");
  });

  it("customer_request swap sets outgoing vehicle back to available", async () => {
    const { swapReservationVehicle } = await getRentalDb();
    const { createVehicle, getVehicleById } = await getVehicleDb();
    const { vehicle: oldVehicle, reservation } = await seedActiveReservation(T1, "OLD-003");
    const newVehicle = await createVehicle(vehicleInput({ plate: "NEW-003" }), T1);

    await swapReservationVehicle(reservation.id, {
      toVehicleId: newVehicle.id,
      toVehicleName: `${newVehicle.make} ${newVehicle.model}`,
      toVehiclePlate: newVehicle.plate,
      reason: "Wants larger car",
      reasonType: "customer_request",
    }, T1);

    expect((await getVehicleById(oldVehicle.id, T1))?.status).toBe("available");
    expect((await getVehicleById(newVehicle.id, T1))?.status).toBe("rented");
  });

  it("swap records reasonType and fromVehicleCondition in history", async () => {
    const { swapReservationVehicle, getReservationById } = await getRentalDb();
    const { createVehicle } = await getVehicleDb();
    const { reservation } = await seedActiveReservation(T1, "OLD-004");
    const newVehicle = await createVehicle(vehicleInput({ plate: "NEW-004" }), T1);

    await swapReservationVehicle(reservation.id, {
      toVehicleId: newVehicle.id,
      toVehicleName: `${newVehicle.make} ${newVehicle.model}`,
      toVehiclePlate: newVehicle.plate,
      reason: "Breakdown on highway",
      reasonType: "breakdown",
      fromVehicleCondition: "Smoke from engine",
    }, T1);

    const updated = await getReservationById(reservation.id, T1);
    expect(updated?.vehicleSwaps?.[0]?.reasonType).toBe("breakdown");
    expect(updated?.vehicleSwaps?.[0]?.fromVehicleCondition).toBe("Smoke from engine");
  });

  it("swap throws if replacement vehicle is not available", async () => {
    const { swapReservationVehicle } = await getRentalDb();
    const { createVehicle } = await getVehicleDb();
    const { reservation } = await seedActiveReservation(T1, "OLD-005");
    const rentedVehicle = await createVehicle(vehicleInput({ plate: "BUSY-001", status: "rented" }), T1);

    await expect(
      swapReservationVehicle(reservation.id, {
        toVehicleId: rentedVehicle.id,
        toVehicleName: `${rentedVehicle.make} ${rentedVehicle.model}`,
        toVehiclePlate: rentedVehicle.plate,
        reason: "swap",
        reasonType: "other",
      }, T1)
    ).rejects.toThrow("Replacement vehicle is not available");
  });
});

describeIfDb("rental-db — rental extension", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  async function seedActive(tenantId: string, plate: string) {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate }), tenantId);
    const customer = await createCustomer(customerInput({ email: `${plate}@ext.com`, licenseNumber: `LIC-${plate}` }), tenantId);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "active" as const }, tenantId);
    return { vehicle, customer, reservation };
  }

  it("extends endDate, updates totalCost, and logs the extension", async () => {
    const { extendReservation, getReservationById } = await getRentalDb();
    const { reservation } = await seedActive(T1, "EXT-001");

    const updated = await extendReservation(reservation.id, { newEndDate: "2030-06-08", newReturnTime: "10:00" }, T1);

    expect(updated.endDate).toBe("2030-06-08");
    expect(updated.totalCost).toBe(245);
    expect(updated.extensions).toHaveLength(1);
    expect(updated.extensions![0].additionalCost).toBe(105);
    expect(updated.extensions![0].previousEndDate).toBe("2030-06-05");
    expect((await getReservationById(reservation.id, T1))?.endDate).toBe("2030-06-08");
  });

  it("rejects extension if new date is not after current return date", async () => {
    const { extendReservation } = await getRentalDb();
    const { reservation } = await seedActive(T1, "EXT-002");

    await expect(
      extendReservation(reservation.id, { newEndDate: "2030-06-05", newReturnTime: "10:00" }, T1)
    ).rejects.toThrow("New return date must be after the current return date");

    await expect(
      extendReservation(reservation.id, { newEndDate: "2030-06-03", newReturnTime: "10:00" }, T1)
    ).rejects.toThrow("New return date must be after the current return date");
  });

  it("rejects extension if another reservation conflicts with the extended period", async () => {
    const { extendReservation, createReservation } = await getRentalDb();
    const { reservation, vehicle, customer } = await seedActive(T1, "EXT-003");

    await createReservation({
      ...reservationInput(customer.id, vehicle.id),
      startDate: "2030-06-07",
      endDate: "2030-06-10",
      status: "confirmed" as const,
    }, T1);

    await expect(
      extendReservation(reservation.id, { newEndDate: "2030-06-09", newReturnTime: "10:00" }, T1)
    ).rejects.toThrow("Vehicle is already reserved during the extended period");
  });

  it("rejects extension for non-active reservations", async () => {
    const { extendReservation } = await getRentalDb();
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate: "EXT-004" }), T1);
    const customer = await createCustomer(customerInput({ email: "ext004@example.com", licenseNumber: "LIC-EXT004" }), T1);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "confirmed" as const }, T1);

    await expect(
      extendReservation(reservation.id, { newEndDate: "2030-06-09", newReturnTime: "10:00" }, T1)
    ).rejects.toThrow("Only active reservations can be extended");
  });
});

describeIfDb("rental-db — return checklist", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  async function seedActive(tenantId: string, plate: string) {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate }), tenantId);
    const customer = await createCustomer(customerInput({ email: `${plate}@ret.com`, licenseNumber: `LIC-RET-${plate}` }), tenantId);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "active" as const }, tenantId);
    return { vehicle, customer, reservation };
  }

  it("marks reservation as completed and stores return checklist", async () => {
    const { completeReservationReturn, getReservationById } = await getRentalDb();
    const { reservation } = await seedActive(T1, "RET-001");

    const updated = await completeReservationReturn(reservation.id, {
      returnMileage: 15000,
      fuelLevel: "full",
      hasDamage: false,
      notes: "All good",
    }, T1);

    expect(updated.status).toBe("completed");
    expect(updated.returnChecklist?.returnMileage).toBe(15000);
    expect(updated.returnChecklist?.fuelLevel).toBe("full");
    expect(updated.returnChecklist?.hasDamage).toBe(false);
    expect(updated.returnChecklist?.notes).toBe("All good");
    expect((await getReservationById(reservation.id, T1))?.status).toBe("completed");
  });

  it("updates vehicle mileage on return", async () => {
    const { completeReservationReturn } = await getRentalDb();
    const { getVehicleById } = await getVehicleDb();
    const { vehicle, reservation } = await seedActive(T1, "RET-002");

    await completeReservationReturn(reservation.id, {
      returnMileage: 22500,
      fuelLevel: "half",
      hasDamage: false,
    }, T1);

    expect((await getVehicleById(vehicle.id, T1))?.mileage).toBe(22500);
  });

  it("sets vehicle to available when no damage reported", async () => {
    const { completeReservationReturn } = await getRentalDb();
    const { getVehicleById } = await getVehicleDb();
    const { vehicle, reservation } = await seedActive(T1, "RET-003");

    await completeReservationReturn(reservation.id, {
      returnMileage: 11000,
      fuelLevel: "full",
      hasDamage: false,
    }, T1);

    expect((await getVehicleById(vehicle.id, T1))?.status).toBe("available");
  });

  it("sets vehicle to maintenance when damage is reported", async () => {
    const { completeReservationReturn } = await getRentalDb();
    const { getVehicleById } = await getVehicleDb();
    const { vehicle, reservation } = await seedActive(T1, "RET-004");

    await completeReservationReturn(reservation.id, {
      returnMileage: 11500,
      fuelLevel: "quarter",
      hasDamage: true,
      damageDescription: "Rear bumper scratch",
    }, T1);

    expect((await getVehicleById(vehicle.id, T1))?.status).toBe("maintenance");
    expect((await getVehicleById(vehicle.id, T1))?.mileage).toBe(11500);
  });

  it("rejects return for non-active reservations", async () => {
    const { completeReservationReturn } = await getRentalDb();
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate: "RET-005" }), T1);
    const customer = await createCustomer(customerInput({ email: "ret005@example.com", licenseNumber: "LIC-RET005" }), T1);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "confirmed" as const }, T1);

    await expect(
      completeReservationReturn(reservation.id, {
        returnMileage: 10500,
        fuelLevel: "full",
        hasDamage: false,
      }, T1)
    ).rejects.toThrow("Only active reservations can be returned");
  });

  it("completed reservation cannot be returned again", async () => {
    const { completeReservationReturn } = await getRentalDb();
    const { reservation } = await seedActive(T1, "RET-006");

    await completeReservationReturn(reservation.id, {
      returnMileage: 12000,
      fuelLevel: "full",
      hasDamage: false,
    }, T1);

    await expect(
      completeReservationReturn(reservation.id, {
        returnMileage: 12100,
        fuelLevel: "full",
        hasDamage: false,
      }, T1)
    ).rejects.toThrow("Only active reservations can be returned");
  });
});

describeIfDb("rental-db — payment tracking", () => {
  beforeEach(async () => {
    await cleanupTestTenants();
    await ensureTestTenants();
  });
  afterEach(cleanupTestTenants);

  async function seedReservation(tenantId: string, plate: string, status: "confirmed" | "active" | "completed" = "active") {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation, completeReservationReturn } = await getRentalDb();
    const vehicle = await createVehicle(vehicleInput({ plate }), tenantId);
    const customer = await createCustomer(customerInput({ email: `${plate}@pay.com`, licenseNumber: `LIC-PAY-${plate}` }), tenantId);
    const reservation = await createReservation({ ...reservationInput(customer.id, vehicle.id), status: "active" as const }, tenantId);
    if (status === "completed") {
      await completeReservationReturn(reservation.id, { returnMileage: 11000, fuelLevel: "full", hasDamage: false }, tenantId);
      return { vehicle, customer, reservation: { ...reservation, status: "completed" as const } };
    }
    if (status === "confirmed") {
      const v2 = await createVehicle(vehicleInput({ plate: `${plate}B` }), tenantId);
      const c2 = await createCustomer(customerInput({ email: `${plate}b@pay.com`, licenseNumber: `LIC-PAY-${plate}B` }), tenantId);
      const r2 = await createReservation({ ...reservationInput(c2.id, v2.id), status: "confirmed" as const }, tenantId);
      return { vehicle: v2, customer: c2, reservation: r2 };
    }
    return { vehicle, customer, reservation };
  }

  it("marks an active reservation as paid", async () => {
    const { markReservationPaid, getReservationById } = await getRentalDb();
    const { reservation } = await seedReservation(T1, "PAY-001");

    const updated = await markReservationPaid(reservation.id, { method: "cash" }, T1);

    expect(updated.payment).toBeDefined();
    expect(updated.payment?.method).toBe("cash");
    expect(updated.payment?.paidAt).toBeTruthy();
    expect((await getReservationById(reservation.id, T1))?.payment?.method).toBe("cash");
  });

  it("stores paidAt as an ISO timestamp", async () => {
    const { markReservationPaid } = await getRentalDb();
    const before = new Date().toISOString();
    const { reservation } = await seedReservation(T1, "PAY-002");

    const updated = await markReservationPaid(reservation.id, { method: "cash" }, T1);
    const after = new Date().toISOString();

    expect(updated.payment?.paidAt).toBeTruthy();
    expect(updated.payment!.paidAt >= before).toBe(true);
    expect(updated.payment!.paidAt <= after).toBe(true);
  });

  it("marks a completed reservation as paid", async () => {
    const { markReservationPaid, getReservationById } = await getRentalDb();
    const { reservation } = await seedReservation(T1, "PAY-003", "completed");

    const updated = await markReservationPaid(reservation.id, { method: "cash" }, T1);

    expect(updated.payment?.method).toBe("cash");
    expect((await getReservationById(reservation.id, T1))?.payment).toBeDefined();
  });

  it("rejects marking a cancelled reservation as paid", async () => {
    const { markReservationPaid, updateReservationStatus } = await getRentalDb();
    const { reservation } = await seedReservation(T1, "PAY-004");
    await updateReservationStatus(reservation.id, { status: "cancelled" }, T1);

    await expect(
      markReservationPaid(reservation.id, { method: "cash" }, T1)
    ).rejects.toThrow("Cannot mark a cancelled reservation as paid");
  });

  it("rejects marking an already-paid reservation as paid again", async () => {
    const { markReservationPaid } = await getRentalDb();
    const { reservation } = await seedReservation(T1, "PAY-005");
    await markReservationPaid(reservation.id, { method: "cash" }, T1);

    await expect(
      markReservationPaid(reservation.id, { method: "cash" }, T1)
    ).rejects.toThrow("Reservation is already marked as paid");
  });

  it("is isolated across tenants", async () => {
    const { createVehicle: cvA } = await getVehicleDb();
    const { createCustomer: ccA, createReservation: crA, markReservationPaid } = await getRentalDb();
    const vA = await cvA(vehicleInput({ plate: "PAY-T1" }), T1);
    const cA = await ccA(customerInput({ email: "t1pay@example.com", licenseNumber: "LIC-T1PAY" }), T1);
    const rA = await crA({ ...reservationInput(cA.id, vA.id), status: "active" as const }, T1);

    await expect(
      markReservationPaid(rA.id, { method: "cash" }, T2)
    ).rejects.toThrow("Reservation not found");
  });
});
