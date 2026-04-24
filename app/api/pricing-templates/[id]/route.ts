import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { updateTemplate, deleteTemplate } from "@/lib/pricing-db";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "manageSettings");
    const { name, tiers } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    await updateTemplate(id, tenantId, name.trim(), tiers ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "manageSettings");
    await deleteTemplate(id, tenantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
