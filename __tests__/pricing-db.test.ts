import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Integration tests — require a real PostgreSQL database.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

const T1 = "pricing_test_tenant_a";
const T2 = "pricing_test_tenant_b";

async function getDb() { return import("@/lib/db"); }
async function getPricingDb() { return import("@/lib/pricing-db"); }
async function getVehicleDb() { return import("@/lib/vehicle-db"); }
async function getRentalDb() { return import("@/lib/rental-db"); }

async function cleanup() {
  if (!hasDb) return;
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`DELETE FROM reservation_extras WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM reservations WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenant_reservation_counters WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM customers WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM vehicle_pricing_tiers WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM vehicle_images WHERE vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM vehicles WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM pricing_template_tiers WHERE template_id IN (SELECT id FROM pricing_templates WHERE tenant_id IN (${T1}, ${T2}))`);
  await db.execute(sql`DELETE FROM pricing_templates WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenant_settings WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM users WHERE tenant_id IN (${T1}, ${T2})`);
  await db.execute(sql`DELETE FROM tenants WHERE id IN (${T1}, ${T2})`);
}

async function ensureTenants() {
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    INSERT INTO tenants (id, name, slug, plan, active)
    VALUES
      (${T1}, 'Pricing Test A', 'pricing-test-a', 'trial', true),
      (${T2}, 'Pricing Test B', 'pricing-test-b', 'trial', true)
    ON CONFLICT (id) DO NOTHING
  `);
}

function baseVehicle(overrides: Record<string, unknown> = {}) {
  return {
    make: "Fiat", model: "Punto", year: 2020, plate: "NS-100-AA",
    color: "White", status: "available" as const, category: "compact" as const,
    transmission: "Manual" as const, fuelType: "Gasoline" as const,
    seats: 5, luggageCount: 2, dailyRate: 50, mileage: 0,
    location: "Airport", lastService: "2025-01-01", nextService: "2026-01-01",
    image: "", images: [] as string[],
    ...overrides,
  };
}

function baseCustomer(overrides: Record<string, string> = {}) {
  return {
    firstName: "Test", lastName: "User", email: "test@example.com",
    phone: "+381600000000", licenseNumber: "LIC-001", licenseExpiry: "2030-01-01",
    address: "Novi Sad", nationality: "RS", dateOfBirth: "1990-01-01",
    ...overrides,
  };
}

// Standard template tiers: ≤3 days €80, ≤7 days €65, ≤30 days €45, above €35
const STANDARD_TIERS = [
  { maxDays: 3 as number | null, dailyRate: 80 },
  { maxDays: 7 as number | null, dailyRate: 65 },
  { maxDays: 30 as number | null, dailyRate: 45 },
  { maxDays: null, dailyRate: 35 },
];

describeIfDb("pricing-db — template CRUD", () => {
  beforeEach(async () => { await cleanup(); await ensureTenants(); });
  afterEach(cleanup);

  it("creates a template and retrieves its tiers", async () => {
    const { createTemplate, getTemplatesForTenant } = await getPricingDb();
    await createTemplate(T1, "Standard", STANDARD_TIERS);
    const templates = await getTemplatesForTenant(T1);
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Standard");
    expect(templates[0].tiers).toHaveLength(4);
  });

  it("templates are isolated between tenants", async () => {
    const { createTemplate, getTemplatesForTenant } = await getPricingDb();
    await createTemplate(T1, "Standard", STANDARD_TIERS);
    expect(await getTemplatesForTenant(T1)).toHaveLength(1);
    expect(await getTemplatesForTenant(T2)).toHaveLength(0);
  });

  it("updates template name and tiers", async () => {
    const { createTemplate, updateTemplate, getTemplatesForTenant } = await getPricingDb();
    const id = await createTemplate(T1, "Old name", STANDARD_TIERS);
    await updateTemplate(id, T1, "New name", [{ maxDays: null, dailyRate: 40 }]);
    const [tmpl] = await getTemplatesForTenant(T1);
    expect(tmpl.name).toBe("New name");
    expect(tmpl.tiers).toHaveLength(1);
    expect(tmpl.tiers[0].dailyRate).toBe(40);
  });

  it("deletes a template", async () => {
    const { createTemplate, deleteTemplate, getTemplatesForTenant } = await getPricingDb();
    const id = await createTemplate(T1, "To delete", STANDARD_TIERS);
    await deleteTemplate(id, T1);
    expect(await getTemplatesForTenant(T1)).toHaveLength(0);
  });

  it("cannot delete another tenant's template", async () => {
    const { createTemplate, deleteTemplate, getTemplatesForTenant } = await getPricingDb();
    const id = await createTemplate(T1, "T1 template", STANDARD_TIERS);
    await deleteTemplate(id, T2); // no-op — wrong tenant
    expect(await getTemplatesForTenant(T1)).toHaveLength(1); // still there
  });
});

describeIfDb("pricing-db — getEffectiveTiers", () => {
  beforeEach(async () => { await cleanup(); await ensureTenants(); });
  afterEach(cleanup);

  it("returns template tiers when vehicle has a template assigned", async () => {
    const { createTemplate, getEffectiveTiers } = await getPricingDb();
    const { createVehicle } = await getVehicleDb();
    const templateId = await createTemplate(T1, "Standard", STANDARD_TIERS);
    const v = await createVehicle(baseVehicle({ plate: "NS-101-AA", pricingTemplateId: templateId }), T1);
    const tiers = await getEffectiveTiers(v.id, templateId);
    expect(tiers).toHaveLength(4);
    expect(tiers.some((t) => t.dailyRate === 80)).toBe(true);
    expect(tiers.some((t) => t.dailyRate === 35)).toBe(true);
  });

  it("returns vehicle custom tiers when no template is assigned", async () => {
    const { getEffectiveTiers, setVehiclePricingTiers } = await getPricingDb();
    const { createVehicle } = await getVehicleDb();
    const v = await createVehicle(baseVehicle({ plate: "NS-102-AA" }), T1);
    await setVehiclePricingTiers(v.id, T1, [
      { maxDays: 5, dailyRate: 60 },
      { maxDays: null, dailyRate: 45 },
    ]);
    const tiers = await getEffectiveTiers(v.id, null);
    expect(tiers).toHaveLength(2);
    expect(tiers[0].dailyRate).toBe(60);
  });

  it("returns empty array when no template and no custom tiers", async () => {
    const { getEffectiveTiers } = await getPricingDb();
    const { createVehicle } = await getVehicleDb();
    const v = await createVehicle(baseVehicle({ plate: "NS-103-AA" }), T1);
    const tiers = await getEffectiveTiers(v.id, null);
    expect(tiers).toHaveLength(0);
  });
});

describeIfDb("pricing-db — reservation cost with tiered pricing", () => {
  beforeEach(async () => { await cleanup(); await ensureTenants(); });
  afterEach(cleanup);

  async function setup() {
    const { createTemplate } = await getPricingDb();
    const { createVehicle } = await getVehicleDb();
    const { createCustomer } = await getRentalDb();
    const templateId = await createTemplate(T1, "Standard", STANDARD_TIERS);
    const vehicle = await createVehicle(
      baseVehicle({ plate: "NS-200-AA", pricingTemplateId: templateId }),
      T1,
    );
    const customer = await createCustomer(baseCustomer(), T1);
    return { templateId, vehicle, customer };
  }

  function reservation(customerId: string, vehicleId: string, startDate: string, endDate: string) {
    return {
      customerId, vehicleId, startDate, endDate,
      pickupTime: "10:00", returnTime: "10:00",
      pickupLocation: "Airport", returnLocation: "Airport",
      extras: [] as string[], status: "confirmed" as const, notes: "",
    };
  }

  it("flat rate vehicle — daily_rate and total_cost use base rate", async () => {
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const v = await createVehicle(baseVehicle({ plate: "NS-300-AA", dailyRate: 35 }), T1);
    const c = await createCustomer(baseCustomer({ email: "flat@example.com" }), T1);
    // 4 days × €35 = €140
    const r = await createReservation(reservation(c.id, v.id, "2030-07-01", "2030-07-05"), T1);
    expect(r.dailyRate).toBe(35);
    expect(r.totalCost).toBe(140);
  });

  it("short rental (2 days) → first tier €80/day, total €160", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-03"), T1);
    expect(r.dailyRate).toBe(80);
    expect(r.totalCost).toBe(160); // 2 × 80
  });

  it("boundary (3 days) → still first tier €80/day, total €240", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-04"), T1);
    expect(r.dailyRate).toBe(80);
    expect(r.totalCost).toBe(240); // 3 × 80
  });

  it("medium rental (5 days) → second tier €65/day, total €325", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-06"), T1);
    expect(r.dailyRate).toBe(65);
    expect(r.totalCost).toBe(325); // 5 × 65
  });

  it("medium rental (7 days) → boundary of second tier €65/day, total €455", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-08"), T1);
    expect(r.dailyRate).toBe(65);
    expect(r.totalCost).toBe(455); // 7 × 65
  });

  it("long rental (13 days) → third tier €45/day, total €585", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-14"), T1);
    expect(r.dailyRate).toBe(45);
    expect(r.totalCost).toBe(585); // 13 × 45
  });

  it("very long rental (40 days) → open-ended tier €35/day, total €1400", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    const r = await createReservation(reservation(customer.id, vehicle.id, "2030-07-01", "2030-08-10"), T1);
    expect(r.dailyRate).toBe(35);
    expect(r.totalCost).toBe(1400); // 40 × 35
  });

  it("manual daily_rate override ignores template tiers", async () => {
    const { vehicle, customer } = await setup();
    const { createReservation } = await getRentalDb();
    // 5 days — template would give €65/day, but override is €100
    const r = await createReservation(
      { ...reservation(customer.id, vehicle.id, "2030-07-01", "2030-07-06"), dailyRate: 100 },
      T1,
    );
    expect(r.dailyRate).toBe(100);
    expect(r.totalCost).toBe(500); // 5 × 100
  });

  it("custom tiers on vehicle (no template) — correct tier applied", async () => {
    const { setVehiclePricingTiers } = await getPricingDb();
    const { createVehicle } = await getVehicleDb();
    const { createCustomer, createReservation } = await getRentalDb();
    const v = await createVehicle(baseVehicle({ plate: "NS-400-AA", dailyRate: 60 }), T1);
    await setVehiclePricingTiers(v.id, T1, [
      { maxDays: 5, dailyRate: 55 },
      { maxDays: null, dailyRate: 40 },
    ]);
    const c = await createCustomer(baseCustomer({ email: "custom@example.com" }), T1);
    // 3 days → first tier €55/day
    const r1 = await createReservation(reservation(c.id, v.id, "2030-08-01", "2030-08-04"), T1);
    expect(r1.dailyRate).toBe(55);
    expect(r1.totalCost).toBe(165);
    // 8 days → open-ended tier €40/day
    const r2 = await createReservation(reservation(c.id, v.id, "2030-09-01", "2030-09-09"), T1);
    expect(r2.dailyRate).toBe(40);
    expect(r2.totalCost).toBe(320);
  });
});
