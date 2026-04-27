import { getApiSession } from "@/lib/api-session";
import { getTenantSettings, updateTenantSettings } from "@/lib/auth-db";
import { getContractTemplatePlaceholderList, getMissingPublishedContractLanguages, listContractTemplates } from "@/lib/contract-template-db";
import { isLocale, type Locale } from "@/lib/i18n-config";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");
    const [templates, settings] = await Promise.all([
      listContractTemplates(tenantId),
      getTenantSettings(tenantId),
    ]);

    return Response.json({
      templates,
      enabledLanguages: settings.contractLanguages,
      defaultLanguage: settings.defaultContractLanguage,
      placeholders: getContractTemplatePlaceholderList(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contract templates";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");

    const body = await request.json() as { contractLanguages?: unknown; defaultContractLanguage?: unknown };

    const contractLanguages = Array.isArray(body.contractLanguages)
      ? [...new Set((body.contractLanguages as unknown[]).map(String).filter(isLocale))] as Locale[]
      : null;

    if (!contractLanguages || contractLanguages.length === 0) {
      return Response.json({ error: "At least one contract language is required" }, { status: 400 });
    }

    const defaultContractLanguage = isLocale(String(body.defaultContractLanguage)) && contractLanguages.includes(String(body.defaultContractLanguage) as Locale)
      ? String(body.defaultContractLanguage) as Locale
      : contractLanguages[0];

    const missingPublished = await getMissingPublishedContractLanguages(tenantId, contractLanguages);
    if (missingPublished.length) {
      return Response.json({ error: "Publish contract templates before enabling those languages" }, { status: 400 });
    }

    const current = await getTenantSettings(tenantId);
    await updateTenantSettings(tenantId, { ...current, contractLanguages, defaultContractLanguage });

    return Response.json({ enabledLanguages: contractLanguages, defaultLanguage: defaultContractLanguage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update contract language settings";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
