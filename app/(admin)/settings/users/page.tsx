import { SettingsUsersPageClient } from "@/components/settings/users-page";
import { countActiveUsersByRole, listUsersByTenant } from "@/lib/auth-db";
import { can } from "@/lib/permissions";
import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SettingsUsersPage() {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (!can(session.role, "manageUsers")) redirect("/");

  const [users, activeTenantAdmins] = await Promise.all([
    listUsersByTenant(session.tenantId, { includeInactive: true, includeSuperAdmin: session.role === "super_admin" }),
    countActiveUsersByRole(session.tenantId, "tenant_admin"),
  ]);

  return <SettingsUsersPageClient users={users} currentUserId={session.userId} activeTenantAdmins={activeTenantAdmins} />;
}
