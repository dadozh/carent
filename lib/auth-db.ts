import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { and, count as sqlCount, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tenantBillingSettings,
  tenantFeatureOverrides,
  tenantInvoices,
  tenants,
  tenantSettings,
  users,
} from "@/lib/db/schema";
import {
  DEFAULT_UI_LOCALE,
  DEFAULT_UI_LOCALES,
  isLocale,
  normalizeDefaultLocale,
  normalizeLocaleSelection,
  type Locale,
} from "@/lib/i18n-config";
import {
  normalizeLocationEntries,
  type LocationEntry,
} from "@/lib/location";
import type { FeatureOverrides } from "@/lib/plan-features";

export type UserRole = "super_admin" | "tenant_admin" | "manager" | "agent" | "viewer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  logoUrl?: string | null;
  createdAt: string;
}

export interface TenantSettings {
  locations: LocationEntry[];
  extras: string[];
  currency: string;
  contractLanguages: Locale[];
  uiLanguages: Locale[];
  defaultContractLanguage: Locale;
  defaultUiLanguage: Locale;
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
  active: boolean;
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

export const TENANT_USER_ROLES = [
  "tenant_admin",
  "manager",
  "agent",
  "viewer",
] as const satisfies readonly UserRole[];

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  locations: [
    { key: "Airport", labels: { en: "Airport", sr: "Aerodrom" } },
    { key: "Downtown", labels: { en: "Downtown", sr: "Centar grada" } },
  ],
  extras: ["GPS", "Wi-Fi", "Child Seat"],
  currency: "EUR",
  contractLanguages: [...DEFAULT_UI_LOCALES],
  uiLanguages: [...DEFAULT_UI_LOCALES],
  defaultContractLanguage: DEFAULT_UI_LOCALE,
  defaultUiLanguage: DEFAULT_UI_LOCALE,
};

export const DEFAULT_TENANT_BILLING_SETTINGS: TenantBillingSettings = {
  baseMonthlyPrice: 0,
  perVehicleMonthlyPrice: 0,
};

const DEFAULT_TENANT_ID = "t_default";
const DEFAULT_TENANT_SLUG = "default";

export function getDefaultTenantId(): string { return DEFAULT_TENANT_ID; }
export function getDefaultTenantSlug(): string { return DEFAULT_TENANT_SLUG; }

function toMoney(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? "0")) || 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return true;
  }

  if (typeof error === "object" && error !== null && "cause" in error) {
    return isUniqueConstraintError(error.cause);
  }

  return error instanceof Error && error.message.toLowerCase().includes("unique");
}

function isValidTenantUserRole(role: UserRole): boolean {
  return TENANT_USER_ROLES.includes(role as (typeof TENANT_USER_ROLES)[number]);
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function normalizeLanguageList(values: readonly string[], label: string): Locale[] {
  const languages = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (!languages.length) throw new Error(`At least one ${label} language is required`);

  const invalid = languages.find((language) => !isLocale(language));
  if (invalid) throw new Error(`Unsupported ${label} language: ${invalid}`);

  return languages as Locale[];
}

function normalizeTenantLanguageSettings(settings: TenantSettings): Pick<TenantSettings, "contractLanguages" | "uiLanguages" | "defaultContractLanguage" | "defaultUiLanguage"> {
  const contractLanguages = normalizeLanguageList(settings.contractLanguages, "contract");
  const uiLanguages = normalizeLanguageList(settings.uiLanguages, "UI");

  if (!contractLanguages.includes(settings.defaultContractLanguage)) {
    throw new Error("Default contract language must be selected");
  }
  if (!uiLanguages.includes(settings.defaultUiLanguage)) {
    throw new Error("Default UI language must be selected");
  }

  return {
    contractLanguages,
    uiLanguages,
    defaultContractLanguage: settings.defaultContractLanguage,
    defaultUiLanguage: settings.defaultUiLanguage,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeMoneyValue(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be zero or greater`);
  return roundMoney(value);
}

function ensureBillingMonth(value: string): string {
  const billingMonth = value.trim();
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) throw new Error("Billing month must use YYYY-MM format");
  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) throw new Error("Billing month is invalid");
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

function mapTenant(row: typeof tenants.$inferSelect): Tenant {
  return { id: row.id, name: row.name, slug: row.slug, plan: row.plan, active: row.active, logoUrl: row.logoUrl ?? null, createdAt: row.createdAt.toISOString() };
}

function mapUser(row: typeof users.$inferSelect): User {
  return { id: row.id, tenant_id: row.tenantId, email: row.email, password_hash: row.passwordHash, name: row.name, role: row.role as UserRole, active: row.active, created_at: row.createdAt.toISOString() };
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".data");

function generateInitialPassword(): string {
  return `Tmp-${randomUUID().replace(/-/g, "").slice(0, 16)}!`;
}

function writeCredentialsFile(lines: string[]): void {
  try {
    const credPath = path.join(DATA_DIR, "initial-credentials.txt");
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(credPath, ["CARENT — Initial Credentials", "", ...lines, ""].join("\n"), { flag: "a" });
  } catch { /* non-fatal */ }
}

export async function ensureDefaultTenant(): Promise<void> {
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, DEFAULT_TENANT_ID)).limit(1);
  if (!existing.length) {
    await db.insert(tenants).values({ id: DEFAULT_TENANT_ID, name: "CARENT (Default)", slug: DEFAULT_TENANT_SLUG, plan: "trial" });
  }

  const existingAdmin = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.email, "admin@carent.com"))).limit(1);
  if (!existingAdmin.length) {
    const password = generateInitialPassword();
    const msg = `Tenant admin   email=admin@carent.com  password=${password}`;
    await db.insert(users).values({ id: `u_${randomUUID().replace(/-/g, "")}`, tenantId: DEFAULT_TENANT_ID, email: "admin@carent.com", passwordHash: bcrypt.hashSync(password, 10), name: "Admin", role: "tenant_admin" });
    console.log(`\n[CARENT] ${msg}`);
    writeCredentialsFile([msg]);
  }

  const existingPlatform = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.tenantId, DEFAULT_TENANT_ID), eq(users.email, "platform@carent.com"))).limit(1);
  if (!existingPlatform.length) {
    const password = generateInitialPassword();
    const msg = `Platform admin  email=platform@carent.com  password=${password}`;
    await db.insert(users).values({ id: `u_${randomUUID().replace(/-/g, "")}`, tenantId: DEFAULT_TENANT_ID, email: "platform@carent.com", passwordHash: bcrypt.hashSync(password, 10), name: "Platform Admin", role: "super_admin" });
    console.log(`[CARENT] ${msg}\n`);
    writeCredentialsFile([msg]);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(and(eq(users.email, normalizeEmail(email)), eq(users.active, true))).limit(1);
  return row ? mapUser(row) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(and(eq(users.id, id), eq(users.active, true))).limit(1);
  return row ? mapUser(row) : null;
}

export async function getUserByIdForTenant(id: string, tenantId: string, options?: { includeInactive?: boolean }): Promise<User | null> {
  const conditions = [eq(users.id, id), eq(users.tenantId, tenantId)];
  if (!options?.includeInactive) conditions.push(eq(users.active, true));
  const [row] = await db.select().from(users).where(and(...conditions)).limit(1);
  return row ? mapUser(row) : null;
}

export async function listUsersByTenant(tenantId: string, options?: { includeInactive?: boolean; includeSuperAdmin?: boolean }): Promise<User[]> {
  const includeInactive = options?.includeInactive ?? true;
  const includeSuperAdmin = options?.includeSuperAdmin ?? false;
  const conditions = [eq(users.tenantId, tenantId)];
  if (!includeInactive) conditions.push(eq(users.active, true));
  if (!includeSuperAdmin) conditions.push(sql`${users.role} != 'super_admin'`);
  return (await db.select().from(users).where(and(...conditions)).orderBy(users.role, users.name)).map(mapUser);
}

export async function createUser(tenantId: string, email: string, password: string, name: string, role: UserRole): Promise<User> {
  if (!name.trim()) throw new Error("User name is required");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!isValidTenantUserRole(role)) throw new Error("Invalid user role");
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Valid email address is required");
  const id = `u_${randomUUID().replace(/-/g, "")}`;
  try {
    await db.insert(users).values({ id, tenantId, email: normalized, passwordHash: bcrypt.hashSync(password, 10), name: name.trim(), role });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("A user with this email already exists");
    throw error;
  }
  return (await getUserById(id))!;
}

export async function countActiveUsersByRole(tenantId: string, role: UserRole): Promise<number> {
  const [row] = await db.select({ total: sqlCount() }).from(users).where(and(eq(users.tenantId, tenantId), eq(users.role, role), eq(users.active, true)));
  return row?.total ?? 0;
}

export async function updateUserRole(id: string, tenantId: string, role: UserRole): Promise<User | null> {
  if (!isValidTenantUserRole(role)) throw new Error("Invalid user role");
  const result = await db.update(users).set({ role }).where(and(eq(users.id, id), eq(users.tenantId, tenantId))).returning({ id: users.id });
  return result.length ? getUserByIdForTenant(id, tenantId, { includeInactive: true }) : null;
}

export async function setUserActive(id: string, tenantId: string, active: boolean): Promise<User | null> {
  const result = await db.update(users).set({ active }).where(and(eq(users.id, id), eq(users.tenantId, tenantId))).returning({ id: users.id });
  return result.length ? getUserByIdForTenant(id, tenantId, { includeInactive: true }) : null;
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) throw new Error("Password must be at least 8 characters");
  await db.update(users).set({ passwordHash: bcrypt.hashSync(newPassword, 10) }).where(eq(users.id, id));
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function getTenantById(id: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(and(eq(tenants.id, id), eq(tenants.active, true))).limit(1);
  return row ? mapTenant(row) : null;
}

export async function getTenantByIdIncludingInactive(id: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return row ? mapTenant(row) : null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(and(eq(tenants.slug, slug), eq(tenants.active, true))).limit(1);
  return row ? mapTenant(row) : null;
}

export async function updateTenantLogo(tenantId: string, logoUrl: string | null): Promise<void> {
  await db.update(tenants).set({ logoUrl }).where(eq(tenants.id, tenantId));
}

export async function listTenants(): Promise<Tenant[]> {
  return (await db.select().from(tenants).orderBy(sql`${tenants.createdAt} DESC`)).map(mapTenant);
}

export async function listTenantsWithStats(): Promise<TenantWithStats[]> {
  const rows = await db.execute<{ id: string; name: string; slug: string; plan: string; active: boolean; created_at: Date; user_count: string; active_user_count: string }>(sql`
    SELECT t.*, COUNT(u.id) AS user_count, COALESCE(SUM(CASE WHEN u.active THEN 1 ELSE 0 END), 0) AS active_user_count
    FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id GROUP BY t.id ORDER BY t.created_at DESC
  `);
  return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, plan: r.plan, active: r.active, createdAt: new Date(r.created_at).toISOString(), user_count: Number(r.user_count), active_user_count: Number(r.active_user_count) }));
}

export async function createTenant(name: string, slug: string): Promise<Tenant> {
  if (!name.trim()) throw new Error("Tenant name is required");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must use lowercase letters, numbers, and hyphens only");
  const id = `t_${randomUUID().replace(/-/g, "")}`;
  try {
    await db.insert(tenants).values({ id, name: name.trim(), slug });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("A tenant with this slug already exists");
    throw error;
  }
  return (await getTenantByIdIncludingInactive(id))!;
}

export async function createTenantWithAdmin(input: { tenantName: string; slug: string; adminName: string; adminEmail: string; adminPassword: string; plan?: string }): Promise<{ tenant: Tenant; admin: User }> {
  const normalized = normalizeEmail(input.adminEmail);
  const slug = input.slug.trim().toLowerCase();
  if (!input.adminName.trim()) throw new Error("Admin name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Valid admin email is required");
  if (!input.adminPassword || input.adminPassword.length < 8) throw new Error("Admin password must be at least 8 characters");

  return db.transaction(async (tx) => {
    const id = `t_${randomUUID().replace(/-/g, "")}`;
    try {
      await tx.insert(tenants).values({ id, name: input.tenantName.trim(), slug, plan: input.plan?.trim() || "trial" });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new Error("A tenant with this slug already exists");
      throw error;
    }
    const adminId = `u_${randomUUID().replace(/-/g, "")}`;
    try {
      await tx.insert(users).values({ id: adminId, tenantId: id, email: normalized, passwordHash: bcrypt.hashSync(input.adminPassword, 10), name: input.adminName.trim(), role: "tenant_admin" });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new Error("A user with this email already exists");
      throw error;
    }
    const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    const [admin] = await tx.select().from(users).where(eq(users.id, adminId)).limit(1);
    return { tenant: mapTenant(tenant), admin: mapUser(admin) };
  });
}

export async function setTenantActive(id: string, active: boolean): Promise<Tenant | null> {
  const result = await db.update(tenants).set({ active }).where(eq(tenants.id, id)).returning({ id: tenants.id });
  return result.length ? getTenantByIdIncludingInactive(id) : null;
}

export async function updateTenantPlan(id: string, plan: string): Promise<Tenant> {
  const valid = ["trial", "starter", "pro", "enterprise"];
  if (!valid.includes(plan)) throw new Error("Invalid plan");
  const result = await db.update(tenants).set({ plan }).where(eq(tenants.id, id)).returning({ id: tenants.id });
  if (!result.length) throw new Error("Tenant not found");
  return (await getTenantByIdIncludingInactive(id))!;
}

// ─── Tenant settings ──────────────────────────────────────────────────────────

export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  const [row] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  if (!row) return DEFAULT_TENANT_SETTINGS;
  const locations = normalizeLocationEntries(row.locations);
  const extras = uniqueNonEmpty(row.extras ?? []);
  const contractLanguages = normalizeLocaleSelection(row.contractLanguages ?? [], DEFAULT_TENANT_SETTINGS.contractLanguages);
  const uiLanguages = normalizeLocaleSelection(row.uiLanguages ?? [], DEFAULT_TENANT_SETTINGS.uiLanguages);
  return {
    locations: locations.length ? locations : DEFAULT_TENANT_SETTINGS.locations,
    extras: extras.length ? extras : DEFAULT_TENANT_SETTINGS.extras,
    currency: row.currency || DEFAULT_TENANT_SETTINGS.currency,
    contractLanguages,
    uiLanguages,
    defaultContractLanguage: normalizeDefaultLocale(row.defaultContractLanguage, contractLanguages, DEFAULT_TENANT_SETTINGS.defaultContractLanguage),
    defaultUiLanguage: normalizeDefaultLocale(row.defaultUiLanguage, uiLanguages, DEFAULT_TENANT_SETTINGS.defaultUiLanguage),
  };
}

export async function updateTenantSettings(tenantId: string, settings: TenantSettings): Promise<Tenant> {
  const locations = normalizeLocationEntries(settings.locations);
  const extras = uniqueNonEmpty(settings.extras);
  const currency = settings.currency || DEFAULT_TENANT_SETTINGS.currency;
  const languageSettings = normalizeTenantLanguageSettings(settings);
  if (!locations.length) throw new Error("At least one location is required");
  await db.insert(tenantSettings).values({ tenantId, locations, extras, currency, ...languageSettings })
    .onConflictDoUpdate({ target: tenantSettings.tenantId, set: { locations, extras, currency, ...languageSettings, updatedAt: sql`NOW()` } });
  return (await getTenantByIdIncludingInactive(tenantId))!;
}

// ─── Feature overrides ────────────────────────────────────────────────────────

export async function getTenantFeatureOverrides(tenantId: string): Promise<FeatureOverrides> {
  const rows = await db.select().from(tenantFeatureOverrides).where(eq(tenantFeatureOverrides.tenantId, tenantId));
  return Object.fromEntries(rows.map((r) => [r.feature, r.enabled])) as FeatureOverrides;
}

export async function setTenantFeatureOverride(tenantId: string, feature: string, enabled: boolean | null): Promise<void> {
  if (enabled === null) {
    await db.delete(tenantFeatureOverrides).where(and(eq(tenantFeatureOverrides.tenantId, tenantId), eq(tenantFeatureOverrides.feature, feature)));
  } else {
    await db.insert(tenantFeatureOverrides).values({ tenantId, feature, enabled })
      .onConflictDoUpdate({ target: [tenantFeatureOverrides.tenantId, tenantFeatureOverrides.feature], set: { enabled } });
  }
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export async function getTenantBillingSettings(tenantId: string): Promise<TenantBillingSettings> {
  const [row] = await db.select().from(tenantBillingSettings).where(eq(tenantBillingSettings.tenantId, tenantId)).limit(1);
  if (!row) return DEFAULT_TENANT_BILLING_SETTINGS;
  return { baseMonthlyPrice: toMoney(row.baseMonthlyPrice), perVehicleMonthlyPrice: toMoney(row.perVehicleMonthlyPrice) };
}

export async function updateTenantBillingSettings(tenantId: string, settings: TenantBillingSettings): Promise<TenantBillingSettings> {
  const tenant = await getTenantByIdIncludingInactive(tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const base = normalizeMoneyValue(settings.baseMonthlyPrice, "Base monthly price");
  const perVehicle = normalizeMoneyValue(settings.perVehicleMonthlyPrice, "Per-car monthly price");
  await db.insert(tenantBillingSettings).values({ tenantId, baseMonthlyPrice: String(base), perVehicleMonthlyPrice: String(perVehicle) })
    .onConflictDoUpdate({ target: tenantBillingSettings.tenantId, set: { baseMonthlyPrice: String(base), perVehicleMonthlyPrice: String(perVehicle), updatedAt: sql`NOW()` } });
  return getTenantBillingSettings(tenantId);
}

export async function listTenantInvoices(tenantId: string): Promise<TenantInvoice[]> {
  const rows = await db.select().from(tenantInvoices).where(eq(tenantInvoices.tenantId, tenantId)).orderBy(sql`${tenantInvoices.billingMonth} DESC, ${tenantInvoices.createdAt} DESC`);
  return rows.map((r) => ({ id: r.id, tenant_id: r.tenantId, billing_month: r.billingMonth, period_start: r.periodStart, period_end: r.periodEnd, base_monthly_price: toMoney(r.baseMonthlyPrice), per_vehicle_monthly_price: toMoney(r.perVehicleMonthlyPrice), vehicle_count: r.vehicleCount, total_amount: toMoney(r.totalAmount), status: r.status, created_at: r.createdAt.toISOString() }));
}

export async function createTenantInvoice(input: { tenantId: string; billingMonth: string; vehicleCount: number; baseMonthlyPrice: number; perVehicleMonthlyPrice: number }): Promise<TenantInvoice> {
  const tenant = await getTenantByIdIncludingInactive(input.tenantId);
  if (!tenant) throw new Error("Tenant not found");
  if (!Number.isInteger(input.vehicleCount) || input.vehicleCount < 0) throw new Error("Vehicle count must be zero or greater");
  const billingMonth = ensureBillingMonth(input.billingMonth);
  const { periodStart, periodEnd } = getInvoicePeriod(billingMonth);
  const base = normalizeMoneyValue(input.baseMonthlyPrice, "Base monthly price");
  const perVehicle = normalizeMoneyValue(input.perVehicleMonthlyPrice, "Per-car monthly price");
  const total = roundMoney(base + input.vehicleCount * perVehicle);
  const id = `inv_${randomUUID().replace(/-/g, "")}`;
  try {
    await db.insert(tenantInvoices).values({ id, tenantId: input.tenantId, billingMonth, periodStart, periodEnd, baseMonthlyPrice: String(base), perVehicleMonthlyPrice: String(perVehicle), vehicleCount: input.vehicleCount, totalAmount: String(total) });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("An invoice for this tenant and month already exists");
    throw error;
  }
  const [row] = await db.select().from(tenantInvoices).where(eq(tenantInvoices.id, id)).limit(1);
  return { id: row.id, tenant_id: row.tenantId, billing_month: row.billingMonth, period_start: row.periodStart, period_end: row.periodEnd, base_monthly_price: toMoney(row.baseMonthlyPrice), per_vehicle_monthly_price: toMoney(row.perVehicleMonthlyPrice), vehicle_count: row.vehicleCount, total_amount: toMoney(row.totalAmount), status: row.status, created_at: row.createdAt.toISOString() };
}
