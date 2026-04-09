import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getTenantById, getTenantFeatureOverrides, getUserById, type UserRole } from "@/lib/auth-db";
import type { FeatureOverrides } from "@/lib/plan-features";

export interface SessionPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  name: string;
  email: string;
  homeTenantId?: string;
  isImpersonating?: boolean;
  /** Populated fresh from DB on every verify — not read from JWT. */
  plan?: string;
  /** Per-tenant feature overrides; populated fresh from DB, not stored in JWT. */
  featureOverrides?: FeatureOverrides;
}

const COOKIE_NAME = "carent_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as unknown as SessionPayload;
    const user = getUserById(session.userId);
    const effectiveTenantId = session.tenantId;

    if (!user) return null;
    if (!getTenantById(user.tenant_id)) return null;
    if (effectiveTenantId !== user.tenant_id && user.role !== "super_admin") return null;
    const tenant = getTenantById(effectiveTenantId);
    if (!tenant) return null;

    return {
      userId: user.id,
      tenantId: effectiveTenantId,
      role: user.role,
      name: user.name,
      email: user.email,
      homeTenantId: user.tenant_id,
      isImpersonating: effectiveTenantId !== user.tenant_id,
      plan: tenant.plan,
      featureOverrides: getTenantFeatureOverrides(effectiveTenantId) as FeatureOverrides,
    };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionOrNull(): Promise<SessionPayload | null> {
  return verifySession();
}
