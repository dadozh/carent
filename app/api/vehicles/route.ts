import { createVehicle, listVehicles } from "@/lib/vehicle-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "read");
    return Response.json({ vehicles: listVehicles(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, userId, userName, role, requestContext } = await getApiSession();
    assertCan(role, "manageFleet");
    const data = await request.json();
    const vehicle = createVehicle(data, tenantId);
    logAction({
      tenantId,
      userId,
      userName,
      userRole: role,
      entityType: "vehicle",
      entityId: vehicle.id,
      action: "created",
      detail: `${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return Response.json({ vehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create vehicle";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
