import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getApiSession } from "@/lib/api-session";
import { getAuditRequestContext } from "@/lib/audit-request";
import { getContractTemplate, updateContractTemplateDraft } from "@/lib/contract-template-db";
import { sanitizeContractTemplateDocument } from "@/lib/contract-template-content";
import { isLocale } from "@/lib/i18n-config";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const [{ language }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "manageSettings");
    if (!isLocale(language)) return Response.json({ error: "Unsupported language" }, { status: 400 });

    const template = await getContractTemplate(tenantId, language);
    if (!template) return Response.json({ error: "Template not found" }, { status: 404 });
    return Response.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contract template";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const [{ language }, session] = await Promise.all([params, getApiSession()]);
    assertCan(session.role, "manageSettings");
    if (!isLocale(language)) return Response.json({ error: "Unsupported language" }, { status: 400 });

    const body = await request.json() as { name?: string; draft?: unknown };
    const draft = sanitizeContractTemplateDocument(body.draft, language);
    const template = await updateContractTemplateDraft(session.tenantId, language, {
      name: `${body.name ?? ""}`,
      draft,
    });

    const requestContext = await getAuditRequestContext();
    void logAction({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      userRole: session.role,
      entityType: "settings",
      entityId: template.id,
      action: "updated_contract_template",
      detail: stringifyAuditDetail({
        summary: "Contract template",
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
    const message = error instanceof Error ? error.message : "Unable to save contract template";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
