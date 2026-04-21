import { getCustomerById, updateCustomer } from "@/lib/rental-db";
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
    const customer = await getCustomerById(id, tenantId);
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
    const [{ id }, session] = await Promise.all([params, getApiSession()]);
    const { tenantId, userId, userName, role, requestContext } = session;
    assertCan(role, "writeReservation");
    const data = await request.json();
    const customer = await updateCustomer(id, data, tenantId);
    const flags = [data.blacklisted ? "blacklisted" : null, data.verified === false ? "unverified" : null].filter(Boolean).join(", ");
    void logAction({
      tenantId,
      userId,
      userName,
      userRole: role,
      entityType: "customer",
      entityId: id,
      action: "updated",
      detail: `${customer.firstName} ${customer.lastName}${flags ? ` — ${flags}` : ""}`,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
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
