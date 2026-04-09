import { listAuditLogs, type AuditEntityType } from "@/lib/audit-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { assertPlanFeature } from "@/lib/plan-features";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { tenantId, role, plan } = await getApiSession();
    assertCan(role, "manageSettings");
    assertPlanFeature(plan, "auditLog");
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") as AuditEntityType | null;
    const limit = Number(searchParams.get("limit") ?? "");
    const logs = listAuditLogs(tenantId, {
      entityType: entityType ?? undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return Response.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
