import { countAuditLogsFiltered, listAuditActors, listAuditLogs, type AuditCategory, type AuditEntityType } from "@/lib/audit-db";
import { getTenantByIdIncludingInactive } from "@/lib/auth-db";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifySession();
    if (!session) throw new Error("Unauthorized");
    if (session.role !== "super_admin") throw new Error("Forbidden");

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? "";
    if (!tenantId || !getTenantByIdIncludingInactive(tenantId)) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    const entityType = searchParams.get("entityType") as AuditEntityType | null;
    const category = searchParams.get("category") as AuditCategory | null;
    const userId = searchParams.get("userId") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "");
    const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 25;
    const offset = (normalizedPage - 1) * normalizedPageSize;
    const options = {
      category: category ?? undefined,
      entityType: entityType ?? undefined,
      userId,
      dateFrom,
      dateTo,
    };

    return Response.json({
      logs: listAuditLogs(tenantId, { ...options, limit: normalizedPageSize, offset }),
      actors: listAuditActors(tenantId),
      total: countAuditLogsFiltered(tenantId, options),
      page: normalizedPage,
      pageSize: normalizedPageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "Unauthorized" ? 401
      : message === "Forbidden" ? 403
      : 500;
    return Response.json({ error: message }, { status });
  }
}
