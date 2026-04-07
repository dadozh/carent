import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Vehicle } from "@/lib/mock-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "carent.sqlite");

type VehicleInput = Omit<Vehicle, "id" | "maintenanceLog" | "rentalHistory">;

interface VehicleRow {
  data: string;
}

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;

  mkdirSync(DATA_DIR, { recursive: true });
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

  return db;
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

export function listVehicles(): Vehicle[] {
  const rows = getDb()
    .prepare("SELECT data FROM vehicles ORDER BY created_at DESC")
    .all() as VehicleRow[];

  return rows.map(parseVehicle);
}

export function getVehicleById(id: string): Vehicle | null {
  const row = getDb()
    .prepare("SELECT data FROM vehicles WHERE id = ?")
    .get(id) as VehicleRow | undefined;

  return row ? parseVehicle(row) : null;
}

export function createVehicle(input: VehicleInput): Vehicle {
  const vehicle: Vehicle = normalizeVehicle({
    ...input,
    id: `v_${randomUUID()}`,
    maintenanceLog: [],
    rentalHistory: [],
  });

  getDb()
    .prepare("INSERT INTO vehicles (id, data) VALUES (?, ?)")
    .run(vehicle.id, JSON.stringify(vehicle));

  return vehicle;
}

export function updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
  const existing = getVehicleById(id);
  if (!existing) return null;

  const vehicle: Vehicle = normalizeVehicle({ ...existing, ...updates, id });
  getDb()
    .prepare("UPDATE vehicles SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(vehicle), id);

  return vehicle;
}
