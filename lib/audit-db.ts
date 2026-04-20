import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

export type AuditEntityType = "reservation" | "vehicle" | "customer" | "user" | "settings" | "tenant" | "billing";
export type AuditCategory = "operations" | "admin";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  category: AuditCategory;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  detail: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogActor {
  userId: string;
  userName: string;
}

interface AuditRow {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  category: string;
  entity_type: string;
  entity_id: string;
  action: string;
  detail: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

type AuditLogInsert = Omit<AuditLogEntry, "id" | "createdAt" | "category"> & { category?: AuditCategory };

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;

  if (!DB_PATH.startsWith(":")) mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
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
  return db;
}

const ALLOWED_MIGRATION_TABLES = ["audit_logs"] as const;
type AllowedTable = (typeof ALLOWED_MIGRATION_TABLES)[number];

function addColumnIfMissing(tableName: AllowedTable, columnName: string, columnDef: string) {
  const cols = db!.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((col) => col.name === columnName)) {
    db!.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
  }
}

/** For testing only — closes and resets the DB singleton. */
export function __closeAuditDb() {
  db?.close();
  db = null;
}

export function logAction(entry: AuditLogInsert): void {
  try {
    const category = entry.category ?? getAuditCategory(entry.entityType);
    getDb()
      .prepare(`
        INSERT INTO audit_logs (id, tenant_id, user_id, user_name, user_role, category, entity_type, entity_id, action, detail, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        entry.tenantId,
        entry.userId,
        entry.userName,
        entry.userRole,
        category,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.detail,
        entry.ipAddress,
        entry.userAgent,
      );
  } catch {
    // Audit logging must never break the main operation
  }
}

export function getAuditCategory(entityType: AuditEntityType): AuditCategory {
  switch (entityType) {
    case "reservation":
    case "vehicle":
    case "customer":
      return "operations";
    case "user":
    case "settings":
    case "tenant":
    case "billing":
      return "admin";
  }
}

function normalizeAuditCategory(value: string | null | undefined, entityType: AuditEntityType): AuditCategory {
  return value === "admin" || value === "operations" ? value : getAuditCategory(entityType);
}

export function countAuditLogs(tenantId: string, options: { entityType?: AuditEntityType; category?: AuditCategory } = {}): number {
  const { entityType, category } = options;

  let query = "SELECT COUNT(*) as total FROM audit_logs WHERE tenant_id = ?";
  const params: string[] = [tenantId];

  if (category) {
    query += " AND COALESCE(NULLIF(category, ''), CASE entity_type WHEN 'reservation' THEN 'operations' WHEN 'vehicle' THEN 'operations' WHEN 'customer' THEN 'operations' ELSE 'admin' END) = ?";
    params.push(category);
  }

  if (entityType) {
    query += " AND entity_type = ?";
    params.push(entityType);
  }

  const row = getDb().prepare(query).get(...params) as { total: number };
  return row.total;
}

export function listAuditLogs(
  tenantId: string,
  options: { entityType?: AuditEntityType; category?: AuditCategory; userId?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number } = {}
): AuditLogEntry[] {
  const { entityType, category, userId, dateFrom, dateTo, limit = 25, offset = 0 } = options;

  let query = "SELECT * FROM audit_logs WHERE tenant_id = ?";
  const params: (string | number)[] = [tenantId];

  if (category) {
    query += " AND COALESCE(NULLIF(category, ''), CASE entity_type WHEN 'reservation' THEN 'operations' WHEN 'vehicle' THEN 'operations' WHEN 'customer' THEN 'operations' ELSE 'admin' END) = ?";
    params.push(category);
  }

  if (entityType) {
    query += " AND entity_type = ?";
    params.push(entityType);
  }

  if (userId) {
    query += " AND user_id = ?";
    params.push(userId);
  }

  if (dateFrom) {
    query += " AND DATE(created_at) >= DATE(?)";
    params.push(dateFrom);
  }

  if (dateTo) {
    query += " AND DATE(created_at) <= DATE(?)";
    params.push(dateTo);
  }

  query += " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?";
  params.push(limit);
  params.push(offset);

  const rows = getDb().prepare(query).all(...params) as AuditRow[];

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    category: normalizeAuditCategory(row.category, row.entity_type as AuditEntityType),
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    action: row.action,
    detail: row.detail,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

export function countAuditLogsFiltered(
  tenantId: string,
  options: { entityType?: AuditEntityType; category?: AuditCategory; userId?: string; dateFrom?: string; dateTo?: string } = {}
): number {
  const { entityType, category, userId, dateFrom, dateTo } = options;

  let query = "SELECT COUNT(*) as total FROM audit_logs WHERE tenant_id = ?";
  const params: string[] = [tenantId];

  if (category) {
    query += " AND COALESCE(NULLIF(category, ''), CASE entity_type WHEN 'reservation' THEN 'operations' WHEN 'vehicle' THEN 'operations' WHEN 'customer' THEN 'operations' ELSE 'admin' END) = ?";
    params.push(category);
  }

  if (entityType) {
    query += " AND entity_type = ?";
    params.push(entityType);
  }

  if (userId) {
    query += " AND user_id = ?";
    params.push(userId);
  }

  if (dateFrom) {
    query += " AND DATE(created_at) >= DATE(?)";
    params.push(dateFrom);
  }

  if (dateTo) {
    query += " AND DATE(created_at) <= DATE(?)";
    params.push(dateTo);
  }

  const row = getDb().prepare(query).get(...params) as { total: number };
  return row.total;
}

export function listAuditActors(tenantId: string): AuditLogActor[] {
  const rows = getDb().prepare(`
    SELECT user_id, MAX(user_name) AS user_name, MAX(created_at) AS last_seen
    FROM audit_logs
    WHERE tenant_id = ?
    GROUP BY user_id
    ORDER BY last_seen DESC, user_name ASC
  `).all(tenantId) as Array<{ user_id: string; user_name: string }>;

  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
  }));
}
