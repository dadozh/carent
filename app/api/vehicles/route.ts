import { createVehicle, listVehicles } from "@/lib/vehicle-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";

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
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageFleet");
    const data = await request.json();
    const vehicle = createVehicle(data, tenantId);
    return Response.json({ vehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create vehicle";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
