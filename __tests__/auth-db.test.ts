import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Integration tests requiring a real PostgreSQL database.
// Set DATABASE_URL to run them.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

async function getAuthDb() {
  return import("@/lib/auth-db");
}

async function getDb() {
  return import("@/lib/db");
}

// Use a slug prefix to isolate test tenants
const SLUG_PREFIX = "test-auth-";

async function cleanupTestTenants() {
  if (!hasDb) return;
  const { db } = await getDb();
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    DELETE FROM users WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE ${SLUG_PREFIX + "%"})
  `);
  await db.execute(sql`
    DELETE FROM tenant_settings WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE ${SLUG_PREFIX + "%"})
  `);
  await db.execute(sql`
    DELETE FROM tenant_billing_settings WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE ${SLUG_PREFIX + "%"})
  `);
  await db.execute(sql`
    DELETE FROM tenant_invoices WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE ${SLUG_PREFIX + "%"})
  `);
  await db.execute(sql`
    DELETE FROM tenants WHERE slug LIKE ${SLUG_PREFIX + "%"}
  `);
}

function testSlug(suffix: string) {
  return `${SLUG_PREFIX}${suffix}`;
}

describeIfDb("auth-db — tenant user management", () => {
  beforeEach(cleanupTestTenants);
  afterEach(cleanupTestTenants);

  it("lists active and inactive users inside a tenant", async () => {
    const { createTenant, createUser, listUsersByTenant, setUserActive } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("a1"));

    const activeUser = await createUser(tenant.id, "ana@example.com", "password123", "Ana", "agent");
    const inactiveUser = await createUser(tenant.id, "marko@example.com", "password123", "Marko", "viewer");
    await setUserActive(inactiveUser.id, tenant.id, false);

    const activeOnly = await listUsersByTenant(tenant.id, { includeInactive: false });
    const allUsers = await listUsersByTenant(tenant.id, { includeInactive: true });
    expect(activeOnly.map((u) => u.id)).toContain(activeUser.id);
    expect(activeOnly.map((u) => u.id)).not.toContain(inactiveUser.id);
    expect(allUsers.map((u) => u.id)).toContain(inactiveUser.id);
  });

  it("updates role only inside the matching tenant", async () => {
    const { createTenant, createUser, getUserByIdForTenant, updateUserRole } = await getAuthDb();
    const tenantA = await createTenant("Tenant A", testSlug("b1"));
    const tenantB = await createTenant("Tenant B", testSlug("b2"));
    const user = await createUser(tenantA.id, "ana@example.com", "password123", "Ana", "agent");

    expect(await updateUserRole(user.id, tenantB.id, "manager")).toBeNull();
    expect((await getUserByIdForTenant(user.id, tenantA.id))?.role).toBe("agent");

    expect((await updateUserRole(user.id, tenantA.id, "manager"))?.role).toBe("manager");
  });

  it("activates and deactivates only within the matching tenant", async () => {
    const { createTenant, createUser, getUserByIdForTenant, setUserActive } = await getAuthDb();
    const tenantA = await createTenant("Tenant A", testSlug("c1"));
    const tenantB = await createTenant("Tenant B", testSlug("c2"));
    const user = await createUser(tenantA.id, "ana@example.com", "password123", "Ana", "agent");

    expect(await setUserActive(user.id, tenantB.id, false)).toBeNull();
    expect((await getUserByIdForTenant(user.id, tenantA.id, { includeInactive: true }))?.active).toBe(true);

    expect((await setUserActive(user.id, tenantA.id, false))?.active).toBe(false);
  });

  it("counts only active users for a role", async () => {
    const { countActiveUsersByRole, createTenant, createUser, setUserActive } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("d1"));
    const adminA = await createUser(tenant.id, "admin-a@example.com", "password123", "Admin A", "tenant_admin");
    await createUser(tenant.id, "admin-b@example.com", "password123", "Admin B", "tenant_admin");

    expect(await countActiveUsersByRole(tenant.id, "tenant_admin")).toBe(2);

    await setUserActive(adminA.id, tenant.id, false);
    expect(await countActiveUsersByRole(tenant.id, "tenant_admin")).toBe(1);
  });

  it("creates a tenant together with its initial tenant admin", async () => {
    const { createTenantWithAdmin, getUserByEmail } = await getAuthDb();

    const { tenant, admin } = await createTenantWithAdmin({
      tenantName: "Tenant A",
      slug: testSlug("e1"),
      adminName: "Ana Admin",
      adminEmail: "ana@tenant-a.com",
      adminPassword: "password123",
      plan: "starter",
    });

    expect(tenant.slug).toBe(testSlug("e1"));
    expect(tenant.plan).toBe("starter");
    expect(admin.role).toBe("tenant_admin");
    expect((await getUserByEmail("ana@tenant-a.com"))?.id).toBe(admin.id);
  });

  it("lists tenant stats including total and active users", async () => {
    const { createTenant, createUser, listTenantsWithStats, setUserActive } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("f1"));
    const inactiveUser = await createUser(tenant.id, "viewer@tenant-a.com", "password123", "Viewer", "viewer");
    await createUser(tenant.id, "agent@tenant-a.com", "password123", "Agent", "agent");
    await setUserActive(inactiveUser.id, tenant.id, false);

    const allStats = await listTenantsWithStats();
    const stats = allStats.find((row) => row.id === tenant.id);
    expect(stats?.user_count).toBe(2);
    expect(stats?.active_user_count).toBe(1);
  });

  it("returns updated tenant state when toggling active flag", async () => {
    const { createTenant, getTenantById, getTenantByIdIncludingInactive, setTenantActive } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("g1"));

    expect((await setTenantActive(tenant.id, false))?.active).toBe(false);
    expect(await getTenantById(tenant.id)).toBeNull();
    expect((await getTenantByIdIncludingInactive(tenant.id))?.active).toBe(false);
  });

  it("returns default tenant settings when none were customized", async () => {
    const { createTenant, getTenantSettings } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("h1"));

    expect(await getTenantSettings(tenant.id)).toEqual({
      locations: ["Airport", "Downtown"],
      extras: ["GPS", "Wi-Fi", "Child Seat"],
    });
  });

  it("updates tenant settings with unique non-empty values", async () => {
    const { createTenant, getTenantSettings, updateTenantSettings } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("i1"));

    await updateTenantSettings(tenant.id, {
      locations: ["Airport", " Downtown ", "Airport", ""],
      extras: ["GPS", "Baby Seat", "GPS"],
      currency: "EUR",
    });

    expect(await getTenantSettings(tenant.id)).toEqual({
      locations: ["Airport", "Downtown"],
      extras: ["GPS", "Baby Seat"],
      currency: "EUR",
    });
  });

  it("returns default tenant billing settings until customized", async () => {
    const { createTenant, getTenantBillingSettings } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("j1"));

    expect(await getTenantBillingSettings(tenant.id)).toEqual({
      baseMonthlyPrice: 0,
      perVehicleMonthlyPrice: 0,
    });
  });

  it("updates tenant billing settings", async () => {
    const { createTenant, getTenantBillingSettings, updateTenantBillingSettings } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("k1"));

    await updateTenantBillingSettings(tenant.id, {
      baseMonthlyPrice: 99.9,
      perVehicleMonthlyPrice: 12.345,
    });

    expect(await getTenantBillingSettings(tenant.id)).toEqual({
      baseMonthlyPrice: 99.9,
      perVehicleMonthlyPrice: 12.35,
    });
  });

  it("creates invoice snapshots and blocks duplicate tenant-month invoices", async () => {
    const { createTenant, createTenantInvoice, listTenantInvoices } = await getAuthDb();
    const tenant = await createTenant("Tenant A", testSlug("l1"));

    const invoice = await createTenantInvoice({
      tenantId: tenant.id,
      billingMonth: "2026-03",
      vehicleCount: 4,
      baseMonthlyPrice: 100,
      perVehicleMonthlyPrice: 15,
    });

    expect(invoice.period_start).toBe("2026-03-01");
    expect(invoice.period_end).toBe("2026-03-31");
    expect(invoice.total_amount).toBe(160);
    expect(await listTenantInvoices(tenant.id)).toHaveLength(1);

    await expect(
      createTenantInvoice({
        tenantId: tenant.id,
        billingMonth: "2026-03",
        vehicleCount: 5,
        baseMonthlyPrice: 100,
        perVehicleMonthlyPrice: 15,
      })
    ).rejects.toThrow("already exists");
  });
});
