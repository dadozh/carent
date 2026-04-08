"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/app/(admin)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="current-password" className="text-sm font-medium">
          Current password
        </label>
        <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm font-medium">
            New password
          </label>
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating password..." : "Update password"}
      </Button>
    </form>
  );
}
