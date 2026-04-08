import { describe, it, expect, beforeEach, afterEach } from "vitest";

process.env.CARENT_DB_PATH = ":memory:";

async function getVehicleDb() {
  return import("@/lib/vehicle-db");
}

async function getRentalDb() {
  return import("@/lib/rental-db");
}

async function getAuthDb() {
  return import("@/lib/auth-db");
}

const T1 = "tenant_a";
const T2 = "tenant_b";

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

describe("rental-db — customers", () => {
  beforeEach(async () => {
    const { __closeDb: closeR } = await getRentalDb();
    closeR();
    const { __closeDb: closeV } = await getVehicleDb();
    closeV();
  });

  afterEach(async () => {
    const { __closeDb: closeR } = await getRentalDb();
    closeR();
    const { __closeDb: closeV } = await getVehicleDb();
    closeV();
  });

  it("creates a customer scoped to tenant", async () => {
    const { createCustomer, listCustomers } = await getRentalDb();
    createCustomer(customerInput(), T1);
    expect(listCustomers(T1)).toHaveLength(1);
    expect(listCustomers(T2)).toHaveLength(0);
  });

  it("getCustomerById returns null for wrong tenant", async () => {
    const { createCustomer, getCustomerById } = await getRentalDb();
    const c = createCustomer(customerInput(), T1);
    expect(getCustomerById(c.id, T1)).not.toBeNull();
    expect(getCustomerById(c.id, T2)).toBeNull();
  });

  it("duplicate check is per-tenant — same email allowed in different tenants", async () => {
    const { createCustomer } = await getRentalDb();
    createCustomer(customerInput(), T1);
    // Same email in T2 should succeed
    expect(() => createCustomer(customerInput(), T2)).not.toThrow();
  });

  it("duplicate check blocks same email within same tenant", async () => {
    const { createCustomer } = await getRentalDb();
    createCustomer(customerInput(), T1);
    expect(() => createCustomer(customerInput(), T1)).toThrow("already exists");
  });

  it("updateCustomerImages throws for wrong tenant", async () => {
    const { createCustomer, updateCustomerImages } = await getRentalDb();
    const c = createCustomer(customerInput(), T1);
    expect(() => updateCustomerImages(c.id, ["img.jpg"], T2)).toThrow("Customer not found");
  });
});

describe("rental-db — reservations", () => {
  beforeEach(async () => {
    const { __closeDb: closeR } = await getRentalDb();
    closeR();
    const { __closeDb: closeV } = await getVehicleDb();
    closeV();
  });

  afterEach(async () => {
    const { __closeDb: closeR } = await getRentalDb();
    closeR();
    const { __closeDb: closeV } = await getVehicleDb();
    closeV();
  });

  async function seedForTenant(tenantId: string, plate = "NS-100") {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();

    const vehicle = createVehicle(vehicleInput({ plate }), tenantId);
    const customer = createCustomer(
      customerInput({ email: `${tenantId}@example.com`, licenseNumber: `LIC-${tenantId}` }),
      tenantId
    );
    const reservation = createReservation(reservationInput(customer.id, vehicle.id), tenantId);
    return { vehicle, customer, reservation };
  }

  it("listReservations is scoped to tenant", async () => {
    const { listReservations } = await getRentalDb();
    await seedForTenant(T1, "T1-PLATE");
    await seedForTenant(T2, "T2-PLATE");
    expect(listReservations(T1)).toHaveLength(1);
    expect(listReservations(T2)).toHaveLength(1);
  });

  it("getReservationById returns null for wrong tenant", async () => {
    const { getReservationById } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-2");
    expect(getReservationById(reservation.id, T1)).not.toBeNull();
    expect(getReservationById(reservation.id, T2)).toBeNull();
  });

  it("updateReservationStatus throws for wrong tenant", async () => {
    const { updateReservationStatus } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-3");
    expect(() =>
      updateReservationStatus(reservation.id, { status: "cancelled" }, T2)
    ).toThrow("Reservation not found");
  });

  it("updateReservationStatus cancels own tenant's reservation", async () => {
    const { updateReservationStatus } = await getRentalDb();
    const { reservation } = await seedForTenant(T1, "T1-PLATE-4");
    const updated = updateReservationStatus(reservation.id, { status: "cancelled" }, T1);
    expect(updated.status).toBe("cancelled");
  });

  it("reservation IDs are independent per tenant", async () => {
    const { listReservations } = await getRentalDb();
    await seedForTenant(T1, "T1-P5");
    await seedForTenant(T2, "T2-P5");
    // Both get ID "1" — per-tenant counter
    const [r1] = listReservations(T1);
    const [r2] = listReservations(T2);
    expect(r1.id).toBe("1");
    expect(r2.id).toBe("1");
  });

  it("vehicle not found across tenants during createReservation", async () => {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();

    const vehicle = createVehicle(vehicleInput({ plate: "X-001" }), T1);
    const customer = createCustomer(
      customerInput({ email: "cross@example.com", licenseNumber: "LIC-CROSS" }),
      T2
    );

    expect(() =>
      createReservation(reservationInput(customer.id, vehicle.id), T2)
    ).toThrow("Vehicle not found");
  });

  it("reservation create enforces tenant-configured extras and locations", async () => {
    const { createReservation, createCustomer } = await getRentalDb();
    const { createVehicle } = await getVehicleDb();
    const { createTenant, updateTenantSettings } = await getAuthDb();

    const tenant = createTenant("Tenant A", "tenant-a");
    updateTenantSettings(tenant.id, {
      locations: ["Depot"],
      extras: ["Cooler"],
    });

    const vehicle = createVehicle(vehicleInput({ plate: "CFG-1", location: "Depot" }), tenant.id);
    const customer = createCustomer(
      customerInput({ email: "cfg@example.com", licenseNumber: "LIC-CFG" }),
      tenant.id
    );

    expect(() =>
      createReservation({
        ...reservationInput(customer.id, vehicle.id),
        pickupLocation: "Airport",
        returnLocation: "Depot",
        extras: ["Cooler"],
      }, tenant.id)
    ).toThrow("Unsupported pickup location");

    expect(() =>
      createReservation({
        ...reservationInput(customer.id, vehicle.id),
        pickupLocation: "Depot",
        returnLocation: "Depot",
        extras: ["GPS"],
      }, tenant.id)
    ).toThrow("Unsupported reservation extra: GPS");
  });

  it("reservation can override daily rate without changing vehicle pricing", async () => {
    const { createReservation, createCustomer } = await getRentalDb();
    const { createVehicle, getVehicleById } = await getVehicleDb();

    const vehicle = createVehicle(vehicleInput({ plate: "RATE-1", dailyRate: 35 }), T1);
    const customer = createCustomer(
      customerInput({ email: "rate@example.com", licenseNumber: "LIC-RATE" }),
      T1
    );

    const reservation = createReservation({
      ...reservationInput(customer.id, vehicle.id),
      dailyRate: 49,
    }, T1);

    expect(reservation.dailyRate).toBe(49);
    expect(reservation.totalCost).toBe(196);
    expect(getVehicleById(vehicle.id, T1)?.dailyRate).toBe(35);
  });

  it("public booking creates a pending reservation in the correct tenant", async () => {
    const { createPublicReservation, listReservations } = await getRentalDb();
    const { vehicle } = await seedForTenant(T1, "PUB-T1");

    const reservation = createPublicReservation({
      vehicleId: vehicle.id,
      startDate: "2030-07-01",
      endDate: "2030-07-05",
      pickupLocation: "Airport",
      returnLocation: "Airport",
      extras: ["GPS"],
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
    expect(listReservations(T1)).toHaveLength(2);
    expect(listReservations(T2)).toHaveLength(0);
  });

  it("public booking cannot book a vehicle from another tenant", async () => {
    const { createPublicReservation } = await getRentalDb();
    const { vehicle } = await seedForTenant(T1, "PUB-T2");

    expect(() =>
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
    ).toThrow("Vehicle not found");
  });
});
