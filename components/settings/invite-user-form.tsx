"use client";

import { useActionState } from "react";
import { inviteUserAction, type InviteUserState } from "@/app/(admin)/settings/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

type UserRole = "super_admin" | "tenant_admin" | "manager" | "agent" | "viewer";

const TENANT_USER_ROLES = [
  "tenant_admin",
  "manager",
  "agent",
  "viewer",
] as const satisfies readonly UserRole[];

export function InviteUserForm() {
  const [state, action, pending] = useActionState<InviteUserState, FormData>(inviteUserAction, undefined);
  const { t } = useI18n();

  const roleLabels: Record<UserRole, string> = {
    super_admin: t("settings.users.role.super_admin"),
    tenant_admin: t("settings.users.role.tenant_admin"),
    manager: t("settings.users.role.manager"),
    agent: t("settings.users.role.agent"),
    viewer: t("settings.users.role.viewer"),
  };

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="invite-name" className="text-sm font-medium">
            {t("settings.users.fullName")}
          </label>
          <Input id="invite-name" name="name" placeholder="e.g. Ana Jovic" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium">
            {t("settings.users.email")}
          </label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="staff@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="invite-role" className="text-sm font-medium">
            {t("settings.users.role")}
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="agent"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {TENANT_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}

      {state?.success ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-medium">{t(state.success)}</p>
          <p className="text-muted-foreground">
            {t("settings.users.tempPassword")} <span className="font-mono text-foreground">{state.tempPassword}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t("settings.users.tempPasswordHelp")}
          </p>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("settings.users.creating") : t("settings.users.invite")}
      </Button>
    </form>
  );
}
