"use server";

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
    updateTenantSettings(session.tenantId, {
      locations: parseList(`${formData.get("locations") ?? ""}`),
      extras: parseList(`${formData.get("extras") ?? ""}`),
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
