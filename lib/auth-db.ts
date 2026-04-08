import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

export type UserRole = "super_admin" | "tenant_admin" | "manager" | "agent" | "viewer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: string; // JSON
  active: number;
  created_at: string;
}

export interface TenantSettings {
  locations: string[];
  extras: string[];
}

export interface TenantBillingSettings {
  baseMonthlyPrice: number;
  perVehicleMonthlyPrice: number;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  active: number;
  created_at: string;
}

export interface TenantWithStats extends Tenant {
  user_count: number;
  active_user_count: number;
}

export interface TenantInvoice {
  id: string;
  tenant_id: string;
  billing_month: string;
  period_start: string;
  period_end: string;
  base_monthly_price: number;
  per_vehicle_monthly_price: number;
  vehicle_count: number;
  total_amount: number;
  status: string;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

export const TENANT_USER_ROLES = [
  "tenant_admin",
  "manager",
  "agent",
  "viewer",
] as const satisfies readonly UserRole[];

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  locations: ["Airport", "Downtown"],
  extras: ["GPS", "Wi-Fi", "Child Seat"],
};

export const DEFAULT_TENANT_BILLING_SETTINGS: TenantBillingSettings = {
  baseMonthlyPrice: 0,
  perVehicleMonthlyPrice: 0,
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  if (!DB_PATH.startsWith(":")) mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      slug       TEXT UNIQUE NOT NULL,
      plan       TEXT NOT NULL DEFAULT 'trial',
      settings   TEXT NOT NULL DEFAULT '{}',
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id),
      email         TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL,
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS tenant_billing_settings (
      tenant_id                  TEXT PRIMARY KEY REFERENCES tenants(id),
      base_monthly_price         REAL NOT NULL DEFAULT 0,
      per_vehicle_monthly_price  REAL NOT NULL DEFAULT 0,
      updated_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenant_invoices (
      id                         TEXT PRIMARY KEY,
      tenant_id                  TEXT NOT NULL REFERENCES tenants(id),
      billing_month              TEXT NOT NULL,
      period_start               TEXT NOT NULL,
      period_end                 TEXT NOT NULL,
      base_monthly_price         REAL NOT NULL,
      per_vehicle_monthly_price  REAL NOT NULL,
      vehicle_count              INTEGER NOT NULL,
      total_amount               REAL NOT NULL,
      status                     TEXT NOT NULL DEFAULT 'draft',
      created_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, billing_month)
    );
  `);
  seedDefaultTenant();
  return db;
}

const DEFAULT_TENANT_ID = "t_default";
const DEFAULT_TENANT_SLUG = "default";

function seedDefaultTenant() {
  if (!db) return;
  const existingTenant = db.prepare("SELECT id FROM tenants WHERE id = ?").get(DEFAULT_TENANT_ID);
  if (!existingTenant) {
    db.prepare(`
      INSERT INTO tenants (id, name, slug, plan) VALUES (?, ?, ?, 'trial')
    `).run(DEFAULT_TENANT_ID, "CARENT (Default)", DEFAULT_TENANT_SLUG);
  }

  const defaultPassword = "admin1234";
  const hash = bcrypt.hashSync(defaultPassword, 10);

  const existingTenantAdmin = db.prepare(`
    SELECT id FROM users WHERE tenant_id = ? AND email = ?
  `).get(DEFAULT_TENANT_ID, "admin@carent.com");

  if (!existingTenantAdmin) {
    const adminId = `u_${randomUUID().replace(/-/g, "")}`;
    db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, DEFAULT_TENANT_ID, "admin@carent.com", hash, "Admin", "tenant_admin");
  }

  const existingPlatformAdmin = db.prepare(`
    SELECT id FROM users WHERE tenant_id = ? AND email = ?
  `).get(DEFAULT_TENANT_ID, "platform@carent.com");

  if (!existingPlatformAdmin) {
    const platformAdminId = `u_${randomUUID().replace(/-/g, "")}`;
    db.prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(platformAdminId, DEFAULT_TENANT_ID, "platform@carent.com", hash, "Platform Admin", "super_admin");

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║      CARENT — Default platform login      ║");
    console.log("║  Email:    platform@carent.com            ║");
    console.log(`║  Password: ${defaultPassword}                    ║`);
    console.log("╚══════════════════════════════════════════╝\n");
  }
}

export function getDefaultTenantId(): string {
  return DEFAULT_TENANT_ID;
}

export function getDefaultTenantSlug(): string {
  return DEFAULT_TENANT_SLUG;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidTenantUserRole(role: UserRole): boolean {
  return TENANT_USER_ROLES.includes(role as (typeof TENANT_USER_ROLES)[number]);
}

export function getUserByEmail(email: string, tenantId?: string): User | null {
  const normalizedEmail = normalizeEmail(email);
  const q = tenantId
    ? getDb().prepare("SELECT * FROM users WHERE email = ? AND tenant_id = ? AND active = 1")
    : getDb().prepare("SELECT * FROM users WHERE email = ? AND active = 1");
  return (tenantId ? q.get(normalizedEmail, tenantId) : q.get(normalizedEmail)) as User | null;
}

export function getUserById(id: string): User | null {
  return getDb().prepare("SELECT * FROM users WHERE id = ? AND active = 1").get(id) as User | null;
}

export function getUserByIdForTenant(
  id: string,
  tenantId: string,
  options?: { includeInactive?: boolean }
): User | null {
  const includeInactive = options?.includeInactive ?? false;
  const query = includeInactive
    ? "SELECT * FROM users WHERE id = ? AND tenant_id = ?"
    : "SELECT * FROM users WHERE id = ? AND tenant_id = ? AND active = 1";

  return getDb().prepare(query).get(id, tenantId) as User | null;
}

export function getTenantById(id: string): Tenant | null {
  return (getDb().prepare("SELECT * FROM tenants WHERE id = ? AND active = 1").get(id) as Tenant | undefined) ?? null;
}

export function getTenantByIdIncludingInactive(id: string): Tenant | null {
  return (getDb().prepare("SELECT * FROM tenants WHERE id = ?").get(id) as Tenant | undefined) ?? null;
}

export function getTenantBySlug(slug: string): Tenant | null {
  return getDb().prepare("SELECT * FROM tenants WHERE slug = ? AND active = 1").get(slug) as Tenant | null;
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeMoneyValue(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or greater`);
  }

  return roundMoney(value);
}

function ensureBillingMonth(value: string) {
  const billingMonth = value.trim();
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
    throw new Error("Billing month must use YYYY-MM format");
  }

  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Billing month is invalid");
  }

  return billingMonth;
}

function getInvoicePeriod(billingMonth: string) {
  const [year, month] = ensureBillingMonth(billingMonth).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    periodStart: `${year}-${paddedMonth}-01`,
    periodEnd: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function parseTenantSettings(settings: string): TenantSettings {
  try {
    const parsed = JSON.parse(settings) as Partial<TenantSettings>;
    const locations = uniqueNonEmpty(parsed.locations ?? []);
    const extras = uniqueNonEmpty(parsed.extras ?? []);

    return {
      locations: locations.length > 0 ? locations : DEFAULT_TENANT_SETTINGS.locations,
      extras: extras.length > 0 ? extras : DEFAULT_TENANT_SETTINGS.extras,
    };
  } catch {
    return DEFAULT_TENANT_SETTINGS;
  }
}

export function getTenantSettings(tenantId: string): TenantSettings {
  const tenant = getTenantByIdIncludingInactive(tenantId);
  if (!tenant) return DEFAULT_TENANT_SETTINGS;
  return parseTenantSettings(tenant.settings);
}

export function getTenantBillingSettings(tenantId: string): TenantBillingSettings {
  const row = getDb().prepare(`
    SELECT base_monthly_price, per_vehicle_monthly_price
    FROM tenant_billing_settings
    WHERE tenant_id = ?
  `).get(tenantId) as
    | { base_monthly_price: number; per_vehicle_monthly_price: number }
    | undefined;

  if (!row) return DEFAULT_TENANT_BILLING_SETTINGS;

  return {
    baseMonthlyPrice: Number(row.base_monthly_price) || 0,
    perVehicleMonthlyPrice: Number(row.per_vehicle_monthly_price) || 0,
  };
}

export function updateTenantSettings(tenantId: string, settings: TenantSettings): Tenant {
  const locations = uniqueNonEmpty(settings.locations);
  const extras = uniqueNonEmpty(settings.extras);

  if (locations.length === 0) throw new Error("At least one location is required");

  getDb()
    .prepare("UPDATE tenants SET settings = ? WHERE id = ?")
    .run(JSON.stringify({ locations, extras }), tenantId);

  return getTenantByIdIncludingInactive(tenantId) as Tenant;
}

export function updateTenantBillingSettings(
  tenantId: string,
  settings: TenantBillingSettings
): TenantBillingSettings {
  const tenant = getTenantByIdIncludingInactive(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const baseMonthlyPrice = normalizeMoneyValue(settings.baseMonthlyPrice, "Base monthly price");
  const perVehicleMonthlyPrice = normalizeMoneyValue(
    settings.perVehicleMonthlyPrice,
    "Per-car monthly price"
  );

  getDb().prepare(`
    INSERT INTO tenant_billing_settings (tenant_id, base_monthly_price, per_vehicle_monthly_price)
    VALUES (?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
      base_monthly_price = excluded.base_monthly_price,
      per_vehicle_monthly_price = excluded.per_vehicle_monthly_price,
      updated_at = CURRENT_TIMESTAMP
  `).run(tenantId, baseMonthlyPrice, perVehicleMonthlyPrice);

  return getTenantBillingSettings(tenantId);
}

export function listTenantInvoices(tenantId: string): TenantInvoice[] {
  return getDb().prepare(`
    SELECT *
    FROM tenant_invoices
    WHERE tenant_id = ?
    ORDER BY billing_month DESC, created_at DESC
  `).all(tenantId) as TenantInvoice[];
}

export function createTenantInvoice(input: {
  tenantId: string;
  billingMonth: string;
  vehicleCount: number;
  baseMonthlyPrice: number;
  perVehicleMonthlyPrice: number;
}): TenantInvoice {
  const tenant = getTenantByIdIncludingInactive(input.tenantId);
  if (!tenant) throw new Error("Tenant not found");
  if (!Number.isInteger(input.vehicleCount) || input.vehicleCount < 0) {
    throw new Error("Vehicle count must be zero or greater");
  }

  const billingMonth = ensureBillingMonth(input.billingMonth);
  const { periodStart, periodEnd } = getInvoicePeriod(billingMonth);
  const baseMonthlyPrice = normalizeMoneyValue(input.baseMonthlyPrice, "Base monthly price");
  const perVehicleMonthlyPrice = normalizeMoneyValue(
    input.perVehicleMonthlyPrice,
    "Per-car monthly price"
  );
  const totalAmount = roundMoney(baseMonthlyPrice + (input.vehicleCount * perVehicleMonthlyPrice));
  const id = `inv_${randomUUID().replace(/-/g, "")}`;

  try {
    getDb().prepare(`
      INSERT INTO tenant_invoices (
        id,
        tenant_id,
        billing_month,
        period_start,
        period_end,
        base_monthly_price,
        per_vehicle_monthly_price,
        vehicle_count,
        total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.tenantId,
      billingMonth,
      periodStart,
      periodEnd,
      baseMonthlyPrice,
      perVehicleMonthlyPrice,
      input.vehicleCount,
      totalAmount
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("An invoice for this tenant and month already exists");
    }
    throw error;
  }

  return getDb().prepare("SELECT * FROM tenant_invoices WHERE id = ?").get(id) as TenantInvoice;
}

export function listTenants(): Tenant[] {
  return getDb().prepare("SELECT * FROM tenants ORDER BY created_at DESC").all() as Tenant[];
}

export function listTenantsWithStats(): TenantWithStats[] {
  return getDb().prepare(`
    SELECT
      t.*,
      COUNT(u.id) AS user_count,
      COALESCE(SUM(CASE WHEN u.active = 1 THEN 1 ELSE 0 END), 0) AS active_user_count
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all() as TenantWithStats[];
}

export function listUsersByTenant(
  tenantId: string,
  options?: { includeInactive?: boolean }
): User[] {
  const includeInactive = options?.includeInactive ?? true;
  const query = includeInactive
    ? "SELECT * FROM users WHERE tenant_id = ? ORDER BY active DESC, role, name"
    : "SELECT * FROM users WHERE tenant_id = ? AND active = 1 ORDER BY role, name";

  return getDb().prepare(query).all(tenantId) as User[];
}

export function createTenant(name: string, slug: string): Tenant {
  if (!name.trim()) throw new Error("Tenant name is required");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers, and hyphens only");
  }

  const id = `t_${randomUUID().replace(/-/g, "")}`;
  try {
    getDb().prepare("INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)").run(id, name.trim(), slug);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("A tenant with this slug already exists");
    }
    throw error;
  }

  return getTenantByIdIncludingInactive(id) as Tenant;
}

export function createTenantWithAdmin(input: {
  tenantName: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan?: string;
}): { tenant: Tenant; admin: User } {
  const normalizedEmail = normalizeEmail(input.adminEmail);
  const slug = input.slug.trim().toLowerCase();
  if (!input.adminName.trim()) throw new Error("Admin name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Valid admin email is required");
  if (!input.adminPassword || input.adminPassword.length < 8) {
    throw new Error("Admin password must be at least 8 characters");
  }

  const tenant = createTenant(input.tenantName, slug);

  try {
    const admin = createUser(
      tenant.id,
      normalizedEmail,
      input.adminPassword,
      input.adminName,
      "tenant_admin"
    );

    if (input.plan?.trim()) {
      getDb().prepare("UPDATE tenants SET plan = ? WHERE id = ?").run(input.plan.trim(), tenant.id);
    }

    return {
      tenant: getTenantByIdIncludingInactive(tenant.id) as Tenant,
      admin,
    };
  } catch (error) {
    getDb().prepare("DELETE FROM tenants WHERE id = ?").run(tenant.id);
    throw error;
  }
}

export function createUser(tenantId: string, email: string, password: string, name: string, role: UserRole): User {
  if (!name.trim()) throw new Error("User name is required");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!isValidTenantUserRole(role)) throw new Error("Invalid user role");

  const id = `u_${randomUUID().replace(/-/g, "")}`;
  const hash = bcrypt.hashSync(password, 10);
  try {
    getDb().prepare(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, tenantId, normalizeEmail(email), hash, name.trim(), role);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("A user with this email already exists in this tenant");
    }
    throw error;
  }

  return getUserById(id) as User;
}

export function countActiveUsersByRole(tenantId: string, role: UserRole): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as total FROM users WHERE tenant_id = ? AND role = ? AND active = 1")
    .get(tenantId, role) as { total: number };

  return row.total;
}

export function updateUserRole(id: string, tenantId: string, role: UserRole): User | null {
  if (!isValidTenantUserRole(role)) throw new Error("Invalid user role");

  const result = getDb()
    .prepare("UPDATE users SET role = ? WHERE id = ? AND tenant_id = ?")
    .run(role, id, tenantId);

  return result.changes ? getUserByIdForTenant(id, tenantId, { includeInactive: true }) : null;
}

export function setUserActive(id: string, tenantId: string, active: boolean): User | null {
  const result = getDb()
    .prepare("UPDATE users SET active = ? WHERE id = ? AND tenant_id = ?")
    .run(active ? 1 : 0, id, tenantId);

  return result.changes ? getUserByIdForTenant(id, tenantId, { includeInactive: true }) : null;
}

export function setTenantActive(id: string, active: boolean): Tenant | null {
  const result = getDb().prepare("UPDATE tenants SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  return result.changes ? getTenantByIdIncludingInactive(id) : null;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function updateUserPassword(id: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
}

/** For testing only — closes and resets the DB singleton. */
export function __closeDb() {
  db?.close();
  db = null;
}
