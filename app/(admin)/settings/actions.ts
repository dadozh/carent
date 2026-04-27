"use server";

import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import { getTenantSettings, updateTenantSettings } from "@/lib/auth-db";
import { isLocale, type Locale } from "@/lib/i18n-config";
import { type TranslationKey } from "@/lib/i18n";
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
    const nextSettings = {
      locations: parseList(`${formData.get("locations") ?? ""}`),
      extras: parseList(`${formData.get("extras") ?? ""}`),
      currency: (["EUR", "USD", "RSD", "BAM"] as const).includes(
        formData.get("currency") as "EUR"
      ) ? `${formData.get("currency")}` : "EUR",
      contractLanguages: parseLanguageList(formData, "contractLanguages"),
      uiLanguages: parseLanguageList(formData, "uiLanguages"),
    };
    const defaultContractLanguage = parseDefaultLanguage(formData, "defaultContractLanguage", nextSettings.contractLanguages);
    const defaultUiLanguage = parseDefaultLanguage(formData, "defaultUiLanguage", nextSettings.uiLanguages);
    const previousSettings = await getTenantSettings(session.tenantId);
    await updateTenantSettings(session.tenantId, {
      locations: nextSettings.locations,
      extras: nextSettings.extras,
      currency: nextSettings.currency,
      contractLanguages: nextSettings.contractLanguages,
      uiLanguages: nextSettings.uiLanguages,
      defaultContractLanguage,
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
          { key: "contractLanguages", value: nextSettings.contractLanguages.join(", ") },
          { key: "uiLanguages", value: nextSettings.uiLanguages.join(", ") },
        ],
        changes: [
          {
            field: "locations",
            oldValue: previousSettings.locations.join(", ") || null,
            newValue: nextSettings.locations.join(", ") || null,
          },
          {
            field: "extras",
            oldValue: previousSettings.extras.join(", ") || null,
            newValue: nextSettings.extras.join(", ") || null,
          },
          {
            field: "contractLanguages",
            oldValue: previousSettings.contractLanguages.join(", ") || null,
            newValue: nextSettings.contractLanguages.join(", ") || null,
          },
          {
            field: "defaultContractLanguage",
            oldValue: previousSettings.defaultContractLanguage,
            newValue: defaultContractLanguage,
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
