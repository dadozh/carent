import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

export type AuditEntityType = "reservation" | "vehicle" | "customer" | "user" | "settings";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  detail: string;
  createdAt: string;
}

interface AuditRow {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  entity_type: string;
  entity_id: string;
  action: string;
  detail: string;
  created_at: string;
}

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
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      action      TEXT NOT NULL,
      detail      TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
  `);
  return db;
}

/** For testing only — closes and resets the DB singleton. */
export function __closeAuditDb() {
  db?.close();
  db = null;
}

export function logAction(entry: Omit<AuditLogEntry, "id" | "createdAt">): void {
  try {
    getDb()
      .prepare(`
        INSERT INTO audit_logs (id, tenant_id, user_id, user_name, user_role, entity_type, entity_id, action, detail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        entry.tenantId,
        entry.userId,
        entry.userName,
        entry.userRole,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.detail,
      );
  } catch {
    // Audit logging must never break the main operation
  }
}

export function listAuditLogs(tenantId: string, options: { entityType?: AuditEntityType; limit?: number } = {}): AuditLogEntry[] {
  const { entityType, limit = 200 } = options;

  let query = "SELECT * FROM audit_logs WHERE tenant_id = ?";
  const params: (string | number)[] = [tenantId];

  if (entityType) {
    query += " AND entity_type = ?";
    params.push(entityType);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const rows = getDb().prepare(query).all(...params) as AuditRow[];

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
