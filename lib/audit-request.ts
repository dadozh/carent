import { headers } from "next/headers";

export interface AuditRequestContext {
  ipAddress: string;
  userAgent: string;
}

function normalizeIpAddress(value: string | null): string {
  if (!value) return "";
  const first = value.split(",")[0]?.trim() ?? "";
  return first;
}

export async function getAuditRequestContext(): Promise<AuditRequestContext> {
  const requestHeaders = await headers();
  const ipAddress =
    normalizeIpAddress(requestHeaders.get("x-forwarded-for")) ||
    normalizeIpAddress(requestHeaders.get("x-real-ip")) ||
    normalizeIpAddress(requestHeaders.get("cf-connecting-ip")) ||
    "";

  return {
    ipAddress,
    userAgent: requestHeaders.get("user-agent") ?? "",
  };
}
