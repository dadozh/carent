import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { getStoredFilePath } from "@/lib/storage-server";
import { getTenantIdFromUploadPath } from "@/lib/upload-policy";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const [{ path: segments }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    const relativePath = segments.join("/");
    const requestedTenantId = getTenantIdFromUploadPath(relativePath);
    assertCan(role, "read");
    if (requestedTenantId !== tenantId && role !== "super_admin") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const filePath = getStoredFilePath(relativePath);
    const file = await readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Upload path is not tenant-scoped") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to read file" }, { status: 500 });
  }
}
