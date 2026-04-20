"use client";

import { changeUserRoleAction, toggleUserActiveAction } from "@/app/(admin)/settings/users/actions";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

type UserRole = "super_admin" | "tenant_admin" | "manager" | "agent" | "viewer";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
};

const TENANT_USER_ROLES = ["tenant_admin", "manager", "agent", "viewer"] as const satisfies readonly UserRole[];

function formatCreatedAt(value: string) {
  const [datePart = "", timePart = ""] = value.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hours = "00", minutes = "00"] = timePart.split(":");

  if (!year || !month || !day) return value;
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function canMutateUser(targetUser: User, currentUserId: string, activeTenantAdmins: number) {
  if (targetUser.id === currentUserId) return false;
  if (targetUser.role === "tenant_admin" && targetUser.active && activeTenantAdmins <= 1) return false;
  return true;
}

export function SettingsUsersPageClient({
  users,
  currentUserId,
  activeTenantAdmins,
}: {
  users: User[];
  currentUserId: string;
  activeTenantAdmins: number;
}) {
  const { t } = useI18n();

  const roleLabels: Record<UserRole, string> = {
    super_admin: t("settings.users.role.super_admin"),
    tenant_admin: t("settings.users.role.tenant_admin"),
    manager: t("settings.users.role.manager"),
    agent: t("settings.users.role.agent"),
    viewer: t("settings.users.role.viewer"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.users.title")}</h1>
          <p className="text-muted-foreground">{t("settings.users.description")}</p>
        </div>
        <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
          {t("settings.users.myProfile")}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.users.inviteTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.users.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-3 lg:hidden">
            {users.map((user) => {
              const canManage = canMutateUser(user, currentUserId, activeTenantAdmins);

              return (
                <div key={user.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        <Badge variant={user.active ? "secondary" : "outline"}>
                          {user.active ? t("settings.users.active") : t("settings.users.inactive")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {roleLabels[user.role]} {" • "} {t("settings.users.added")} {formatCreatedAt(user.created_at)}
                      </p>
                    </div>

                    <UserActions user={user} canManage={canManage} roleLabels={roleLabels} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.users.user")}</TableHead>
                  <TableHead>{t("settings.users.role")}</TableHead>
                  <TableHead>{t("settings.users.status")}</TableHead>
                  <TableHead>{t("settings.users.created")}</TableHead>
                  <TableHead className="text-right">{t("settings.users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const canManage = canMutateUser(user, currentUserId, activeTenantAdmins);

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{roleLabels[user.role]}</TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "secondary" : "outline"}>
                          {user.active ? t("settings.users.active") : t("settings.users.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCreatedAt(user.created_at)}</TableCell>
                      <TableCell>
                        <UserActions user={user} canManage={canManage} roleLabels={roleLabels} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserActions({
  user,
  canManage,
  roleLabels,
}: {
  user: User;
  canManage: boolean;
  roleLabels: Record<UserRole, string>;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <form action={changeUserRoleAction} className="flex gap-2">
        <input type="hidden" name="userId" value={user.id} />
        <select
          name="role"
          defaultValue={user.role}
          disabled={!canManage}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {TENANT_USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={!canManage}>
          {t("settings.users.changeRole")}
        </Button>
      </form>

      <form action={toggleUserActiveAction}>
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="nextActive" value={user.active ? "false" : "true"} />
        <Button type="submit" variant={user.active ? "destructive" : "secondary"} disabled={!canManage}>
          {user.active ? t("settings.users.deactivate") : t("settings.users.reactivate")}
        </Button>
      </form>
    </div>
  );
}
