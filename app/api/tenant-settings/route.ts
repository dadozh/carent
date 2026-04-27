import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { getTenantSettings, updateTenantSettings } from "@/lib/auth-db";

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

export async function PATCH(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");
    const data = await request.json() as { locations?: string[]; extras?: string[]; currency?: string };
    await updateTenantSettings(tenantId, {
      locations: data.locations ?? [],
      extras: data.extras ?? [],
      currency: sanitizeCurrency(data.currency),
    });
    return Response.json({ settings: await getTenantSettings(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update tenant settings";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
