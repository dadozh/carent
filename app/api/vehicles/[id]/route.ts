import { getVehicleById, updateVehicle } from "@/lib/vehicle-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "read");
    const vehicle = getVehicleById(id, tenantId);
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
    const { tenantId, userId, userName, role } = session;
    assertCan(role, "manageFleet");
    const data = await request.json();
    const vehicle = updateVehicle(id, data, tenantId);
    if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
    logAction({ tenantId, userId, userName, userRole: role, entityType: "vehicle", entityId: id, action: "updated", detail: `${vehicle.make} ${vehicle.model} (${vehicle.plate})` });
    return Response.json({ vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vehicle";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
