"use server";

import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import { getTenantSettings, updateTenantSettings } from "@/lib/auth-db";
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
    };
    const previousSettings = getTenantSettings(session.tenantId);
    updateTenantSettings(session.tenantId, {
      locations: nextSettings.locations,
      extras: nextSettings.extras,
    });
    const requestContext = await getAuditRequestContext();
    logAction({
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
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/settings");
    revalidatePath("/book");

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
  return getTenantSettings(session.tenantId);
}
