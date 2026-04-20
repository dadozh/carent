#!/usr/bin/env node

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DEFAULT_TENANT_ID = "t_default";
const DEFAULT_TENANT_SLUG = "default";
const DEFAULT_ADMIN_EMAIL = "admin@carent.com";
const DEFAULT_PLATFORM_EMAIL = "platform@carent.com";
const DEFAULT_PASSWORD = "admin1234";
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

if (!DB_PATH.startsWith(":")) {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

function addColumnIfMissing(tableName, columnName, columnDef) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
  }
}

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function hasMigration(id) {
  const row = db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(id);
  return Boolean(row);
}

function recordMigration(id, name) {
  db.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(id, name);
}

function runMigration(id, name, apply) {
  if (hasMigration(id)) {
    console.log(`Skipping migration ${id}: ${name}`);
    return;
  }

  console.log(`Applying migration ${id}: ${name}`);
  const transaction = db.transaction(() => {
    apply();
    recordMigration(id, name);
  });
  transaction();
}

function ensureReservationsCompositePrimaryKey() {
  const info = db.prepare("PRAGMA table_info(reservations)").all();
  const tenantPk = info.find((column) => column.name === "tenant_id")?.pk ?? 0;

  if (tenantPk > 0) {
    return;
  }

  const hasTenantColumn = info.some((column) => column.name === "tenant_id");
  const selectTenant = hasTenantColumn ? "COALESCE(tenant_id, 't_default')" : "'t_default'";

  db.exec(`
    CREATE TABLE reservations_new (
      id         TEXT NOT NULL,
      tenant_id  TEXT NOT NULL DEFAULT 't_default',
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO reservations_new (id, tenant_id, data, created_at, updated_at)
      SELECT id, ${selectTenant}, data, created_at, updated_at FROM reservations;
    DROP TABLE reservations;
    ALTER TABLE reservations_new RENAME TO reservations;
  `);
}

function seedDefaultTenantAndUsers() {
  const defaultTenant = db.prepare("SELECT id FROM tenants WHERE id = ?").get(DEFAULT_TENANT_ID);
  if (!defaultTenant) {
    db.prepare(
      "INSERT INTO tenants (id, name, slug, plan) VALUES (?, ?, ?, 'trial')"
    ).run(DEFAULT_TENANT_ID, "CARENT (Default)", DEFAULT_TENANT_SLUG);
  }

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

  const tenantAdmin = db.prepare("SELECT id FROM users WHERE tenant_id = ? AND email = ?").get(
    DEFAULT_TENANT_ID,
    DEFAULT_ADMIN_EMAIL
  );
  if (!tenantAdmin) {
    db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(`u_${randomUUID().replace(/-/g, "")}`, DEFAULT_TENANT_ID, DEFAULT_ADMIN_EMAIL, passwordHash, "Admin", "tenant_admin");
  }

  const platformAdmin = db.prepare("SELECT id FROM users WHERE tenant_id = ? AND email = ?").get(
    DEFAULT_TENANT_ID,
    DEFAULT_PLATFORM_EMAIL
  );
  if (!platformAdmin) {
    db.prepare(
      "INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      `u_${randomUUID().replace(/-/g, "")}`,
      DEFAULT_TENANT_ID,
      DEFAULT_PLATFORM_EMAIL,
      passwordHash,
      "Platform Admin",
      "super_admin"
    );
  }
}

try {
  ensureMigrationsTable();

  runMigration(1, "auth-core", () => {
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

      CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        feature   TEXT NOT NULL,
        enabled   INTEGER NOT NULL CHECK (enabled IN (0, 1)),
        PRIMARY KEY (tenant_id, feature)
      );
    `);
  });

  runMigration(2, "customers-tenant-scope", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id         TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    addColumnIfMissing("customers", "tenant_id", "TEXT NOT NULL DEFAULT 't_default'");
  });

  runMigration(3, "reservations-composite-primary-key", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reservations (
        id         TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    ensureReservationsCompositePrimaryKey();
  });

  runMigration(4, "vehicles-archival", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id         TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    addColumnIfMissing("vehicles", "tenant_id", "TEXT NOT NULL DEFAULT 't_default'");
    addColumnIfMissing("vehicles", "archived_at", "TEXT");
  });

  runMigration(5, "audit-log-request-metadata", () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          TEXT NOT NULL PRIMARY KEY,
        tenant_id   TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        user_name   TEXT NOT NULL,
        user_role   TEXT NOT NULL,
        category    TEXT NOT NULL DEFAULT 'operations',
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        action      TEXT NOT NULL,
        detail      TEXT NOT NULL DEFAULT '',
        ip_address  TEXT NOT NULL DEFAULT '',
        user_agent  TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
    `);
    addColumnIfMissing("audit_logs", "category", "TEXT NOT NULL DEFAULT 'operations'");
    addColumnIfMissing("audit_logs", "ip_address", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing("audit_logs", "user_agent", "TEXT NOT NULL DEFAULT ''");
  });

  runMigration(6, "default-tenant-seed", () => {
    seedDefaultTenantAndUsers();
  });

  console.log(`Migrations complete for ${DB_PATH}`);
} finally {
  db.close();
}
