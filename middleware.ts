import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "carent_session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = [
  "/login",
  "/book",
  "/api/public",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as { userId: string; tenantId: string; role: string; name: string; email: string };

    if (pathname.startsWith("/platform") && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Strip any client-supplied x-* session headers before forwarding
    const headers = new Headers(request.headers);
    headers.delete("x-user-id");
    headers.delete("x-tenant-id");
    headers.delete("x-user-role");
    headers.delete("x-user-name");
    headers.delete("x-user-email");
    headers.set("x-user-id", session.userId);
    headers.set("x-tenant-id", session.tenantId);
    headers.set("x-user-role", session.role);
    headers.set("x-user-name", session.name);
    headers.set("x-user-email", session.email);

    return NextResponse.next({ request: { headers } });
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
