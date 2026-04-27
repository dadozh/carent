"use server";

import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import { getTenantSettings, updateTenantSettings } from "@/lib/auth-db";
import { isLocale, type Locale } from "@/lib/i18n-config";
import { type TranslationKey } from "@/lib/i18n";
import { normalizeLocationEntries } from "@/lib/location";
import { can } from "@/lib/permissions";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TenantSettingsState =
  | {
      error?: TranslationKey;
      success?: TranslationKey;
    }
  | undefined;

function isTranslationKey(value: string): value is TranslationKey {
  return value.startsWith("settings.");
}

function parseList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLocations(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  try {
    return normalizeLocationEntries(JSON.parse(value));
  } catch {
    throw new Error("settings.tenant.updateError");
  }
}

function parseLanguageList(formData: FormData, field: string): Locale[] {
  const values = formData.getAll(field).map(String);
  if (!values.length) throw new Error("settings.tenant.languageSelectionError");
  const invalid = values.find((value) => !isLocale(value));
  if (invalid) throw new Error("settings.tenant.languageSelectionError");
  return [...new Set(values)] as Locale[];
}

function parseDefaultLanguage(formData: FormData, field: string, selectedLanguages: readonly Locale[]): Locale {
  const value = String(formData.get(field) ?? "");
  if (!isLocale(value) || !selectedLanguages.includes(value)) {
    throw new Error("settings.tenant.languageSelectionError");
  }
  return value;
}

export async function updateTenantSettingsAction(
  _prevState: TenantSettingsState,
  formData: FormData
): Promise<TenantSettingsState> {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (!can(session.role, "manageSettings")) redirect("/");

  try {
    const previousSettings = await getTenantSettings(session.tenantId);
    const nextSettings = {
      locations: parseLocations(formData.get("locations")),
      extras: parseList(`${formData.get("extras") ?? ""}`),
      currency: (["EUR", "USD", "RSD", "BAM"] as const).includes(
        formData.get("currency") as "EUR"
      ) ? `${formData.get("currency")}` : "EUR",
      uiLanguages: parseLanguageList(formData, "uiLanguages"),
    };
    const defaultUiLanguage = parseDefaultLanguage(formData, "defaultUiLanguage", nextSettings.uiLanguages);
    await updateTenantSettings(session.tenantId, {
      locations: nextSettings.locations,
      extras: nextSettings.extras,
      currency: nextSettings.currency,
      contractLanguages: previousSettings.contractLanguages,
      defaultContractLanguage: previousSettings.defaultContractLanguage,
      uiLanguages: nextSettings.uiLanguages,
      defaultUiLanguage,
    });
    const requestContext = await getAuditRequestContext();
    void logAction({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      entityType: "settings",
      entityId: session.tenantId,
      action: "updated_tenant_settings",
      detail: stringifyAuditDetail({
        summary: "Tenant settings",
        subtitle: `#${session.tenantId}`,
        metadata: [
          { key: "locationsCount", value: String(nextSettings.locations.length) },
          { key: "extrasCount", value: String(nextSettings.extras.length) },
          { key: "uiLanguages", value: nextSettings.uiLanguages.join(", ") },
        ],
        changes: [
          {
            field: "locations",
            oldValue: previousSettings.locations.map((location) => location.key).join(", ") || null,
            newValue: nextSettings.locations.map((location) => location.key).join(", ") || null,
          },
          {
            field: "extras",
            oldValue: previousSettings.extras.join(", ") || null,
            newValue: nextSettings.extras.join(", ") || null,
          },
          {
            field: "uiLanguages",
            oldValue: previousSettings.uiLanguages.join(", ") || null,
            newValue: nextSettings.uiLanguages.join(", ") || null,
          },
          {
            field: "defaultUiLanguage",
            oldValue: previousSettings.defaultUiLanguage,
            newValue: defaultUiLanguage,
          },
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/settings");
    revalidatePath("/book");
    revalidatePath("/");

    return { success: "settings.tenant.success" };
  } catch (error) {
    return {
      error:
        error instanceof Error && isTranslationKey(error.message)
          ? error.message
          : "settings.tenant.updateError",
    };
  }
}

export async function getTenantSettingsForPage() {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (!can(session.role, "manageSettings")) redirect("/");
  return await getTenantSettings(session.tenantId);
}
