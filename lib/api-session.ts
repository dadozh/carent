import { headers } from "next/headers";
import { getTenantById, getUserById } from "@/lib/auth-db";

export interface ApiSession {
  tenantId: string;
  userId: string;
  userName: string;
  role: string;
}

/**
 * Extracts the session (tenantId, userId, role) from the Next.js request headers
 * that the middleware populates from the JWT.
 *
 * Throws an error with message "Unauthorized" if any field is missing.
 */
export async function getApiSession(): Promise<ApiSession> {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const userId = h.get("x-user-id");
  const headerRole = h.get("x-user-role");

  if (!tenantId || !userId || !headerRole) throw new Error("Unauthorized");

  const user = getUserById(userId);
  if (!user) throw new Error("Unauthorized");
  const effectiveTenantId = tenantId;

  if (effectiveTenantId !== user.tenant_id && user.role !== "super_admin") {
    throw new Error("Unauthorized");
  }
  if (!getTenantById(effectiveTenantId)) throw new Error("Unauthorized");

  return { tenantId: effectiveTenantId, userId: user.id, userName: user.name, role: user.role };
}
