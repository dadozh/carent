"use client";

import { useActionState } from "react";
import { createTenantAction, type CreateTenantState } from "@/app/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLAN_OPTIONS = ["trial", "starter", "growth"] as const;

export function CreateTenantForm() {
  const [state, action, pending] = useActionState<CreateTenantState, FormData>(createTenantAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="tenant-name" className="text-sm font-medium">
            Tenant name
          </label>
          <Input id="tenant-name" name="tenantName" placeholder="e.g. Acme Rent a Car" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tenant-slug" className="text-sm font-medium">
            Slug
          </label>
          <Input id="tenant-slug" name="slug" placeholder="acme-rent" required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-1">
          <label htmlFor="tenant-plan" className="text-sm font-medium">
            Plan
          </label>
          <select
            id="tenant-plan"
            name="plan"
            defaultValue="trial"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="admin-name" className="text-sm font-medium">
            Initial admin name
          </label>
          <Input id="admin-name" name="adminName" placeholder="e.g. Ana Jovic" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="admin-email" className="text-sm font-medium">
            Initial admin email
          </label>
          <Input id="admin-email" name="adminEmail" type="email" placeholder="admin@acme.com" required />
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-medium">{state.success}</p>
          <p className="text-muted-foreground">
            Temporary admin password: <span className="font-mono text-foreground">{state.tempPassword}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Share the password securely with the tenant admin and rotate it after first sign-in.
          </p>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating tenant..." : "Create tenant"}
      </Button>
    </form>
  );
}
