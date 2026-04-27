import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { createTemplate, getTemplatesForTenant } from "@/lib/pricing-db";
import type { PricingTier } from "@/lib/pricing";

function validateTiers(tiers: unknown): tiers is PricingTier[] {
  if (!Array.isArray(tiers) || tiers.length === 0) return false;
  const nullCount = tiers.filter((t) => t.maxDays === null).length;
  if (nullCount !== 1) return false;
  return tiers.every(
    (t) => typeof t.dailyRate === "number" && t.dailyRate > 0 &&
      (t.maxDays === null || (Number.isInteger(t.maxDays) && t.maxDays > 0))
  );
}

export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "read");
    return NextResponse.json({ templates: await getTemplatesForTenant(tenantId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");
    const { name, tiers } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!validateTiers(tiers)) return NextResponse.json({ error: "Invalid tiers: at least one tier required, exactly one open-ended tier (maxDays: null), all rates must be positive" }, { status: 400 });
    const id = await createTemplate(tenantId, name.trim(), tiers);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
