import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROUTE_PREFIX = "/api/uploads";

export interface StorageProvider {
  save(buffer: Buffer<ArrayBufferLike>, filename: string): Promise<string>;
  delete(url: string): Promise<void>;
}

function getUploadDir(): string {
  const uploadDir = process.env.CARENT_UPLOAD_DIR;
  if (!uploadDir) {
    throw new Error("CARENT_UPLOAD_DIR must be set before uploading files");
  }

  return path.resolve(uploadDir);
}

function sanitizeSegment(segment: string): string {
  return segment
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "") || "file";
}

function normalizeRelativePath(input: string): string {
  const normalized = input.replace(/\\/g, "/");
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Invalid upload path");
  }

  return segments.map(sanitizeSegment).join("/");
}

function resolveStoredFilePath(relativePath: string): string {
  const uploadDir = getUploadDir();
  const normalized = normalizeRelativePath(relativePath);
  const absolutePath = path.resolve(uploadDir, normalized);

  if (path.relative(uploadDir, absolutePath).startsWith("..")) {
    throw new Error("Resolved upload path escapes the upload directory");
  }

  return absolutePath;
}

function getRelativePathFromUrl(url: string): string {
  const pathname = url.startsWith("http")
    ? new URL(url).pathname
    : url;

  if (!pathname.startsWith(`${UPLOAD_ROUTE_PREFIX}/`)) {
    throw new Error("Unsupported upload URL");
  }

  const encodedPath = pathname.slice(UPLOAD_ROUTE_PREFIX.length + 1);
  const decodedSegments = encodedPath
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  return normalizeRelativePath(decodedSegments.join("/"));
}

export function createStoredFilename(prefix: string, originalFilename: string): string {
  const cleanPrefix = normalizeRelativePath(prefix);
  const parsed = path.parse(originalFilename);
  const baseName = sanitizeSegment(parsed.name || "upload");
  const extension = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase().slice(0, 16);
  return `${cleanPrefix}/${Date.now()}-${randomUUID()}-${baseName}${extension}`;
}

export function getStoredFilePath(relativePath: string): string {
  return resolveStoredFilePath(relativePath);
}

export function getUploadUrl(relativePath: string): string {
  return `${UPLOAD_ROUTE_PREFIX}/${normalizeRelativePath(relativePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function getStoredFilePathFromUrl(url: string): string {
  return resolveStoredFilePath(getRelativePathFromUrl(url));
}

class DiskProvider implements StorageProvider {
  async save(buffer: Buffer<ArrayBufferLike>, filename: string): Promise<string> {
    const relativePath = normalizeRelativePath(filename);
    const absolutePath = resolveStoredFilePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    return getUploadUrl(relativePath);
  }

  async delete(url: string): Promise<void> {
    const absolutePath = getStoredFilePathFromUrl(url);
    try {
      await unlink(absolutePath);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export const storage: StorageProvider = new DiskProvider();
