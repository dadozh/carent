import { getVehicleById, updateVehicle } from "@/lib/vehicle-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";
import type { Vehicle } from "@/lib/mock-data";

export const runtime = "nodejs";

type VehicleAuditField =
  | "make"
  | "model"
  | "trim"
  | "year"
  | "category"
  | "fuelType"
  | "transmission"
  | "seats"
  | "luggageCount"
  | "color"
  | "plate"
  | "vin"
  | "mileage"
  | "dailyRate"
  | "location"
  | "status";

type VehicleAuditChange = {
  field: VehicleAuditField;
  oldValue: string | number | null;
  newValue: string | number | null;
};

const AUDITED_VEHICLE_FIELDS: VehicleAuditField[] = [
  "make",
  "model",
  "trim",
  "year",
  "category",
  "fuelType",
  "transmission",
  "seats",
  "luggageCount",
  "color",
  "plate",
  "vin",
  "mileage",
  "dailyRate",
  "location",
  "status",
];

function normalizeAuditValue(value: string | number | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return value ?? null;
}

function buildVehicleUpdateAuditDetail(before: Vehicle, after: Vehicle) {
  const changes: VehicleAuditChange[] = AUDITED_VEHICLE_FIELDS.flatMap((field) => {
    const oldValue = normalizeAuditValue(before[field]);
    const newValue = normalizeAuditValue(after[field]);
    if (oldValue === newValue) return [];
    return [{ field, oldValue, newValue }];
  });

  return JSON.stringify({
    summary: `${after.make} ${after.model} (${after.plate})`,
    subtitle: `#${after.id}`,
    changes,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "read");
    const vehicle = await getVehicleById(id, tenantId);
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    return Response.json({ vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, session] = await Promise.all([params, getApiSession()]);
    const { tenantId, userId, userName, role, requestContext } = session;
    assertCan(role, "manageFleet");
    const data = await request.json();
    const existing = await getVehicleById(id, tenantId);
    if (!existing) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    const vehicle = await updateVehicle(id, data, tenantId);
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    void logAction({
      tenantId,
      userId,
      userName,
      userRole: role,
      entityType: "vehicle",
      entityId: id,
      action: "updated",
      detail: buildVehicleUpdateAuditDetail(existing, vehicle),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return Response.json({ vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vehicle";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
