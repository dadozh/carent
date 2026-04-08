import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Vehicle } from "@/lib/mock-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");

type VehicleInput = Omit<Vehicle, "id" | "maintenanceLog" | "rentalHistory">;

interface VehicleRow {
  data: string;
}

interface VehicleLifecycleRow {
  created_at: string;
  archived_at: string | null;
}

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;

  if (!DB_PATH.startsWith(":")) mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing("vehicles", "tenant_id", "TEXT NOT NULL DEFAULT 't_default'");
  addColumnIfMissing("vehicles", "archived_at", "TEXT");

  return db;
}

function addColumnIfMissing(tableName: string, columnName: string, columnDef: string) {
  const cols = db!.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((col) => col.name === columnName)) {
    db!.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
  }
}

/** For testing only — closes and resets the DB singleton. */
export function __closeDb() {
  db?.close();
  db = null;
}

function parseVehicle(row: VehicleRow): Vehicle {
  return normalizeVehicle(JSON.parse(row.data) as Vehicle);
}

function normalizeImageList(images?: string[]) {
  return (images ?? []).filter((image) => image.trim());
}

function normalizeVehicle(vehicle: Vehicle): Vehicle {
  const images = normalizeImageList(vehicle.images);
  return {
    ...vehicle,
    image: vehicle.image?.trim() || images[0] || "",
    images,
  };
}

export function listVehicles(tenantId: string): Vehicle[] {
  const rows = getDb()
    .prepare("SELECT data FROM vehicles WHERE tenant_id = ? ORDER BY created_at DESC")
    .all(tenantId) as VehicleRow[];

  return rows.map(parseVehicle);
}

export function getVehicleById(id: string, tenantId: string): Vehicle | null {
  const row = getDb()
    .prepare("SELECT data FROM vehicles WHERE id = ? AND tenant_id = ?")
    .get(id, tenantId) as VehicleRow | undefined;

  return row ? parseVehicle(row) : null;
}

export function createVehicle(input: VehicleInput, tenantId: string): Vehicle {
  const vehicle: Vehicle = normalizeVehicle({
    ...input,
    id: `v_${randomUUID()}`,
    maintenanceLog: [],
    rentalHistory: [],
  });

  getDb()
    .prepare("INSERT INTO vehicles (id, tenant_id, data, archived_at) VALUES (?, ?, ?, ?)")
    .run(
      vehicle.id,
      tenantId,
      JSON.stringify(vehicle),
      vehicle.status === "retired" ? new Date().toISOString().replace("T", " ").slice(0, 19) : null
    );

  return vehicle;
}

export function updateVehicle(id: string, updates: Partial<Vehicle>, tenantId: string): Vehicle | null {
  const existing = getVehicleById(id, tenantId);
  if (!existing) return null;

  const vehicle: Vehicle = normalizeVehicle({ ...existing, ...updates, id });
  const archivedAt =
    existing.status !== "retired" && vehicle.status === "retired"
      ? new Date().toISOString().replace("T", " ").slice(0, 19)
      : existing.status === "retired" && vehicle.status !== "retired"
        ? null
        : undefined;

  getDb()
    .prepare(`
      UPDATE vehicles
      SET data = ?, archived_at = COALESCE(?, archived_at), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `)
    .run(
      JSON.stringify(vehicle),
      archivedAt === undefined ? null : archivedAt,
      id,
      tenantId
    );

  if (existing.status === "retired" && vehicle.status !== "retired") {
    getDb()
      .prepare("UPDATE vehicles SET archived_at = NULL WHERE id = ? AND tenant_id = ?")
      .run(id, tenantId);
  }

  return vehicle;
}

function getBillingPeriod(billingMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
    throw new Error("Billing month must use YYYY-MM format");
  }

  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Billing month is invalid");
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    periodStart: `${year}-${paddedMonth}-01`,
    periodEnd: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function countBillableVehiclesForMonth(tenantId: string, billingMonth: string): number {
  const { periodStart, periodEnd } = getBillingPeriod(billingMonth);
  const row = getDb().prepare(`
    SELECT COUNT(*) AS total
    FROM vehicles
    WHERE tenant_id = ?
      AND DATE(created_at) <= DATE(?)
      AND (archived_at IS NULL OR DATE(archived_at) >= DATE(?))
  `).get(tenantId, periodEnd, periodStart) as { total: number };

  return row.total;
}

export function __setVehicleLifecycleForTest(
  id: string,
  tenantId: string,
  lifecycle: { createdAt?: string; archivedAt?: string | null }
) {
  if (lifecycle.createdAt !== undefined) {
    getDb()
      .prepare("UPDATE vehicles SET created_at = ? WHERE id = ? AND tenant_id = ?")
      .run(lifecycle.createdAt, id, tenantId);
  }

  if (lifecycle.archivedAt !== undefined) {
    getDb()
      .prepare("UPDATE vehicles SET archived_at = ? WHERE id = ? AND tenant_id = ?")
      .run(lifecycle.archivedAt, id, tenantId);
  }
}
