import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { DEFAULT_TENANT_SETTINGS, getTenantSettings, updateTenantSettings } from "@/lib/auth-db";
import { isLocale, type Locale } from "@/lib/i18n-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "read");
    return Response.json({ settings: await getTenantSettings(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load tenant settings";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}

const VALID_CURRENCIES = ["EUR", "USD", "RSD", "BAM"] as const;
type ValidCurrency = typeof VALID_CURRENCIES[number];
function sanitizeCurrency(value: unknown): ValidCurrency {
  return VALID_CURRENCIES.includes(value as ValidCurrency) ? (value as ValidCurrency) : "EUR";
}

function sanitizeLanguages(value: unknown, fallback: Locale[]): Locale[] {
  if (!Array.isArray(value)) return fallback;
  const languages = [...new Set(value.map(String).filter(isLocale))];
  return languages.length ? languages : fallback;
}

function sanitizeDefaultLanguage(value: unknown, languages: Locale[], fallback: Locale): Locale {
  return isLocale(String(value)) && languages.includes(String(value) as Locale)
    ? (String(value) as Locale)
    : fallback;
}

export async function PATCH(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");
    const data = await request.json() as {
      locations?: string[];
      extras?: string[];
      currency?: string;
      contractLanguages?: string[];
      uiLanguages?: string[];
      defaultContractLanguage?: string;
      defaultUiLanguage?: string;
    };
    const contractLanguages = sanitizeLanguages(data.contractLanguages, DEFAULT_TENANT_SETTINGS.contractLanguages);
    const uiLanguages = sanitizeLanguages(data.uiLanguages, DEFAULT_TENANT_SETTINGS.uiLanguages);
    await updateTenantSettings(tenantId, {
      locations: data.locations ?? [],
      extras: data.extras ?? [],
      currency: sanitizeCurrency(data.currency),
      contractLanguages,
      uiLanguages,
      defaultContractLanguage: sanitizeDefaultLanguage(data.defaultContractLanguage, contractLanguages, DEFAULT_TENANT_SETTINGS.defaultContractLanguage),
      defaultUiLanguage: sanitizeDefaultLanguage(data.defaultUiLanguage, uiLanguages, DEFAULT_TENANT_SETTINGS.defaultUiLanguage),
    });
    return Response.json({ settings: await getTenantSettings(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update tenant settings";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
