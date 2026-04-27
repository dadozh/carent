import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getApiSession } from "@/lib/api-session";
import { getAuditRequestContext } from "@/lib/audit-request";
import { publishContractTemplate } from "@/lib/contract-template-db";
import { isLocale } from "@/lib/i18n-config";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const [{ language }, session] = await Promise.all([params, getApiSession()]);
    assertCan(session.role, "manageSettings");
    if (!isLocale(language)) return Response.json({ error: "Unsupported language" }, { status: 400 });

    const template = await publishContractTemplate(session.tenantId, language);
    const requestContext = await getAuditRequestContext();
    void logAction({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      userRole: session.role,
      entityType: "settings",
      entityId: template.id,
      action: "published_contract_template",
      detail: stringifyAuditDetail({
        summary: "Published contract template",
        subtitle: language,
        metadata: [
          { key: "language", value: language },
          { key: "value", value: template.name },
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return Response.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish contract template";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
