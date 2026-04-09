"use server";

import { randomUUID } from "node:crypto";
import {
  countActiveUsersByRole,
  createUser,
  getUserByIdForTenant,
  setUserActive,
  TENANT_USER_ROLES,
  updateUserRole,
  type UserRole,
} from "@/lib/auth-db";
import { type TranslationKey } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InviteUserState =
  | {
      error?: TranslationKey;
      success?: TranslationKey;
      tempPassword?: string;
    }
  | undefined;

function isTranslationKey(value: string): value is TranslationKey {
  return value.startsWith("settings.");
}

function ensureTenantAdminSession() {
  return verifySession().then((session) => {
    if (!session) redirect("/login");
    if (!can(session.role, "manageUsers")) redirect("/");
    return session;
  });
}

function parseRole(rawRole: FormDataEntryValue | null): UserRole {
  const role = `${rawRole ?? ""}` as UserRole;
  if (!TENANT_USER_ROLES.includes(role as (typeof TENANT_USER_ROLES)[number])) {
    throw new Error("settings.users.error.invalidRole");
  }
  return role;
}

function generateTemporaryPassword() {
  return `Tmp-${randomUUID().replace(/-/g, "").slice(0, 10)}!`;
}

function ensureUserCanBeModified(
  tenantId: string,
  targetUserId: string,
  actingUserId: string
) {
  const user = getUserByIdForTenant(targetUserId, tenantId, { includeInactive: true });
  if (!user) throw new Error("settings.users.error.notFound");
  if (user.role === "super_admin") throw new Error("settings.users.error.notFound");
  if (user.id === actingUserId) throw new Error("settings.users.error.selfChange");
  return user;
}

function assertTenantAdminSafety(
  tenantId: string,
  user: { role: UserRole; active: number },
  next: { role?: UserRole; active?: boolean }
) {
  const nextRole = next.role ?? user.role;
  const nextActive = next.active ?? Boolean(user.active);
  const wouldRemainTenantAdmin = nextRole === "tenant_admin" && nextActive;

  if (user.role === "tenant_admin" && user.active === 1 && !wouldRemainTenantAdmin) {
    const activeAdmins = countActiveUsersByRole(tenantId, "tenant_admin");
    if (activeAdmins <= 1) {
      throw new Error("settings.users.error.lastAdmin");
    }
  }
}

export async function inviteUserAction(
  _prevState: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  const session = await ensureTenantAdminSession();
  const name = `${formData.get("name") ?? ""}`.trim();
  const email = `${formData.get("email") ?? ""}`.trim().toLowerCase();

  try {
    const role = parseRole(formData.get("role"));
    const tempPassword = generateTemporaryPassword();
    createUser(session.tenantId, email, tempPassword, name, role);
    revalidatePath("/settings/users");

    return {
      success: "settings.users.success.created",
      tempPassword,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error && isTranslationKey(error.message)
          ? error.message
          : "settings.users.error.create",
    };
  }
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const session = await ensureTenantAdminSession();
  const targetUserId = `${formData.get("userId") ?? ""}`;
  const nextActive = `${formData.get("nextActive") ?? ""}` === "true";
  const user = ensureUserCanBeModified(session.tenantId, targetUserId, session.userId);

  assertTenantAdminSafety(session.tenantId, user, { active: nextActive });

  const updatedUser = setUserActive(targetUserId, session.tenantId, nextActive);
  if (!updatedUser) throw new Error("settings.users.error.notFound");

  revalidatePath("/settings/users");
}

export async function changeUserRoleAction(formData: FormData): Promise<void> {
  const session = await ensureTenantAdminSession();
  const targetUserId = `${formData.get("userId") ?? ""}`;
  const nextRole = parseRole(formData.get("role"));
  const user = ensureUserCanBeModified(session.tenantId, targetUserId, session.userId);

  assertTenantAdminSafety(session.tenantId, user, { role: nextRole });

  const updatedUser = updateUserRole(targetUserId, session.tenantId, nextRole);
  if (!updatedUser) throw new Error("settings.users.error.notFound");

  revalidatePath("/settings/users");
}
