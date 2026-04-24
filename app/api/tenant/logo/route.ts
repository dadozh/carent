import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { createStoredFilename, getStoredFilePathFromUrl, storage } from "@/lib/storage-server";
import { buildTenantUploadPrefix } from "@/lib/upload-policy";
import { updateTenantLogo, getTenantById } from "@/lib/auth-db";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");

    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP and SVG files are allowed" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
    }

    // Delete the old logo if one exists
    const tenant = await getTenantById(tenantId);
    if (tenant?.logoUrl) {
      try { await storage.delete(tenant.logoUrl); } catch { /* ignore */ }
    }

    const prefix = buildTenantUploadPrefix(tenantId, "logos");
    const filename = createStoredFilename(prefix, file.name);
    const url = await storage.save(buffer, filename);
    await updateTenantLogo(tenantId, url);

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "manageSettings");

    const tenant = await getTenantById(tenantId);
    if (tenant?.logoUrl) {
      try { await storage.delete(tenant.logoUrl); } catch { /* ignore */ }
    }
    await updateTenantLogo(tenantId, null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
