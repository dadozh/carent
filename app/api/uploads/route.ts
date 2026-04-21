import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { createStoredFilename, storage } from "@/lib/storage-server";
import { assertUploadScope, buildTenantUploadPrefix, getUploadAction } from "@/lib/upload-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    const formData = await request.formData();
    const prefixValue = formData.get("prefix");
    const scope = assertUploadScope(typeof prefixValue === "string" ? prefixValue : "");
    assertCan(role, getUploadAction(scope));
    const prefix = buildTenantUploadPrefix(tenantId, scope);
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        const filename = createStoredFilename(prefix, file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        return storage.save(buffer, filename);
      })
    );

    return NextResponse.json({ urls });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload files";
    const status =
      message === "Unauthorized" ? 401
      : message.startsWith("Forbidden") ? 403
      : message === "Invalid upload scope" ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
