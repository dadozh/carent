import { getCustomerById, updateCustomer } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "read");
    const customer = getCustomerById(id, tenantId);
    if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
    return Response.json({ customer });
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
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "writeReservation");
    const data = await request.json();
    const customer = updateCustomer(id, data, tenantId);
    return Response.json({ customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update customer";
    const status =
      message === "Unauthorized" ? 401
      : message.startsWith("Forbidden") ? 403
      : message === "Customer not found" ? 404
      : 400;
    return Response.json({ error: message }, { status });
  }
}
