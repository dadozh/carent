import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { createTemplate, getTemplatesForTenant } from "@/lib/pricing-db";

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
    const id = await createTemplate(tenantId, name.trim(), tiers ?? []);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
