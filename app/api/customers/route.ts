import { createCustomer, listCustomers, updateCustomerImages } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "read");
    return Response.json({ customers: listCustomers(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, userId, userName, role } = await getApiSession();
    assertCan(role, "writeReservation");
    const data = await request.json();
    const customer = createCustomer(data, tenantId);
    logAction({ tenantId, userId, userName, userRole: role, entityType: "customer", entityId: customer.id, action: "created", detail: `${customer.firstName} ${customer.lastName} (${customer.email})` });
    return Response.json({ customer }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "writeReservation");
    const data = await request.json();
    const customer = updateCustomerImages(data.id, data.images ?? [], tenantId);
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
