import { countAuditLogsFiltered, listAuditActors, listAuditLogs, type AuditEntityType } from "@/lib/audit-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { assertPlanFeature } from "@/lib/plan-features";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { tenantId, role, plan, featureOverrides } = await getApiSession();
    assertCan(role, "manageSettings");
    assertPlanFeature(plan, "auditLog", featureOverrides);
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") as AuditEntityType | null;
    const userId = searchParams.get("userId") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "");
    const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 25;
    const offset = (normalizedPage - 1) * normalizedPageSize;
    const options = {
      entityType: entityType ?? undefined,
      userId,
      dateFrom,
      dateTo,
    };
    const logs = listAuditLogs(tenantId, {
      ...options,
      limit: normalizedPageSize,
      offset,
    });
    const total = countAuditLogsFiltered(tenantId, options);
    const actors = listAuditActors(tenantId);
    return Response.json({
      logs,
      actors,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
