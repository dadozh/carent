import { afterEach, beforeEach, describe, expect, it } from "vitest";

process.env.CARENT_DB_PATH = ":memory:";

async function getAuthDb() {
  return import("@/lib/auth-db");
}

describe("auth-db — tenant user management", () => {
  beforeEach(async () => {
    const { __closeDb } = await getAuthDb();
    __closeDb();
  });

  afterEach(async () => {
    const { __closeDb } = await getAuthDb();
    __closeDb();
  });

  it("lists active and inactive users inside a tenant", async () => {
    const { createTenant, createUser, listUsersByTenant, setUserActive } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    const activeUser = createUser(tenant.id, "ana@example.com", "password123", "Ana", "agent");
    const inactiveUser = createUser(tenant.id, "marko@example.com", "password123", "Marko", "viewer");
    setUserActive(inactiveUser.id, tenant.id, false);

    expect(listUsersByTenant(tenant.id, { includeInactive: false }).map((user) => user.id)).toContain(activeUser.id);
    expect(listUsersByTenant(tenant.id, { includeInactive: false }).map((user) => user.id)).not.toContain(inactiveUser.id);
    expect(listUsersByTenant(tenant.id, { includeInactive: true }).map((user) => user.id)).toContain(inactiveUser.id);
  });

  it("updates role only inside the matching tenant", async () => {
    const { createTenant, createUser, getUserByIdForTenant, updateUserRole } = await getAuthDb();
    const tenantA = createTenant("Tenant A", "tenant-a");
    const tenantB = createTenant("Tenant B", "tenant-b");
    const user = createUser(tenantA.id, "ana@example.com", "password123", "Ana", "agent");

    expect(updateUserRole(user.id, tenantB.id, "manager")).toBeNull();
    expect(getUserByIdForTenant(user.id, tenantA.id)?.role).toBe("agent");

    expect(updateUserRole(user.id, tenantA.id, "manager")?.role).toBe("manager");
  });

  it("activates and deactivates only within the matching tenant", async () => {
    const { createTenant, createUser, getUserByIdForTenant, setUserActive } = await getAuthDb();
    const tenantA = createTenant("Tenant A", "tenant-a");
    const tenantB = createTenant("Tenant B", "tenant-b");
    const user = createUser(tenantA.id, "ana@example.com", "password123", "Ana", "agent");

    expect(setUserActive(user.id, tenantB.id, false)).toBeNull();
    expect(getUserByIdForTenant(user.id, tenantA.id)?.active).toBe(1);

    expect(setUserActive(user.id, tenantA.id, false)?.active).toBe(0);
  });

  it("counts only active users for a role", async () => {
    const { countActiveUsersByRole, createTenant, createUser, setUserActive } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");
    const adminA = createUser(tenant.id, "admin-a@example.com", "password123", "Admin A", "tenant_admin");
    createUser(tenant.id, "admin-b@example.com", "password123", "Admin B", "tenant_admin");

    expect(countActiveUsersByRole(tenant.id, "tenant_admin")).toBe(2);

    setUserActive(adminA.id, tenant.id, false);
    expect(countActiveUsersByRole(tenant.id, "tenant_admin")).toBe(1);
  });

  it("creates a tenant together with its initial tenant admin", async () => {
    const { createTenantWithAdmin, getUserByEmail } = await getAuthDb();

    const { tenant, admin } = createTenantWithAdmin({
      tenantName: "Tenant A",
      slug: "tenant-a",
      adminName: "Ana Admin",
      adminEmail: "ana@tenant-a.com",
      adminPassword: "password123",
      plan: "starter",
    });

    expect(tenant.slug).toBe("tenant-a");
    expect(tenant.plan).toBe("starter");
    expect(admin.role).toBe("tenant_admin");
    expect(getUserByEmail("ana@tenant-a.com", tenant.id)?.id).toBe(admin.id);
  });

  it("lists tenant stats including total and active users", async () => {
    const { createTenant, createUser, listTenantsWithStats, setUserActive } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");
    const inactiveUser = createUser(tenant.id, "viewer@tenant-a.com", "password123", "Viewer", "viewer");
    createUser(tenant.id, "agent@tenant-a.com", "password123", "Agent", "agent");
    setUserActive(inactiveUser.id, tenant.id, false);

    const stats = listTenantsWithStats().find((row) => row.id === tenant.id);
    expect(stats?.user_count).toBe(2);
    expect(stats?.active_user_count).toBe(1);
  });

  it("returns updated tenant state when toggling active flag", async () => {
    const { createTenant, getTenantById, getTenantByIdIncludingInactive, setTenantActive } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    expect(setTenantActive(tenant.id, false)?.active).toBe(0);
    expect(getTenantById(tenant.id)).toBeNull();
    expect(getTenantByIdIncludingInactive(tenant.id)?.active).toBe(0);
  });

  it("returns default tenant settings when none were customized", async () => {
    const { createTenant, getTenantSettings } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    expect(getTenantSettings(tenant.id)).toEqual({
      locations: ["Airport", "Downtown"],
      extras: ["GPS", "Wi-Fi", "Child Seat"],
    });
  });

  it("updates tenant settings with unique non-empty values", async () => {
    const { createTenant, getTenantSettings, updateTenantSettings } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    updateTenantSettings(tenant.id, {
      locations: ["Airport", " Downtown ", "Airport", ""],
      extras: ["GPS", "Baby Seat", "GPS"],
    });

    expect(getTenantSettings(tenant.id)).toEqual({
      locations: ["Airport", "Downtown"],
      extras: ["GPS", "Baby Seat"],
    });
  });

  it("returns default tenant billing settings until customized", async () => {
    const { createTenant, getTenantBillingSettings } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    expect(getTenantBillingSettings(tenant.id)).toEqual({
      baseMonthlyPrice: 0,
      perVehicleMonthlyPrice: 0,
    });
  });

  it("updates tenant billing settings", async () => {
    const { createTenant, getTenantBillingSettings, updateTenantBillingSettings } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    updateTenantBillingSettings(tenant.id, {
      baseMonthlyPrice: 99.9,
      perVehicleMonthlyPrice: 12.345,
    });

    expect(getTenantBillingSettings(tenant.id)).toEqual({
      baseMonthlyPrice: 99.9,
      perVehicleMonthlyPrice: 12.35,
    });
  });

  it("creates invoice snapshots and blocks duplicate tenant-month invoices", async () => {
    const { createTenant, createTenantInvoice, listTenantInvoices } = await getAuthDb();
    const tenant = createTenant("Tenant A", "tenant-a");

    const invoice = createTenantInvoice({
      tenantId: tenant.id,
      billingMonth: "2026-03",
      vehicleCount: 4,
      baseMonthlyPrice: 100,
      perVehicleMonthlyPrice: 15,
    });

    expect(invoice.period_start).toBe("2026-03-01");
    expect(invoice.period_end).toBe("2026-03-31");
    expect(invoice.total_amount).toBe(160);
    expect(listTenantInvoices(tenant.id)).toHaveLength(1);

    expect(() =>
      createTenantInvoice({
        tenantId: tenant.id,
        billingMonth: "2026-03",
        vehicleCount: 5,
        baseMonthlyPrice: 100,
        perVehicleMonthlyPrice: 15,
      })
    ).toThrow("already exists");
  });
});
