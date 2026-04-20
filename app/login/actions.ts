"use server";

import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import { getTenantById, getUserByEmail, verifyPassword } from "@/lib/auth-db";
import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "Invalid email or password." };
  }
  if (!getTenantById(user.tenant_id)) {
    return { error: "This tenant is disabled." };
  }

  await createSession({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId: user.tenant_id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    entityType: "user",
    entityId: user.id,
    action: "signed_in",
    detail: stringifyAuditDetail({
      summary: user.name,
      subtitle: `#${user.id}`,
      metadata: [{ key: "email", value: user.email }],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  redirect(next);
}
