"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import {
  generateTenantInvoiceAction,
  type TenantBillingState,
  updateTenantBillingSettingsAction,
} from "@/app/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TenantBillingSettingsForm({
  tenantId,
  initialBaseMonthlyPrice,
  initialPerVehicleMonthlyPrice,
}: {
  tenantId: string;
  initialBaseMonthlyPrice: number;
  initialPerVehicleMonthlyPrice: number;
}) {
  const [state, action, pending] = useActionState<TenantBillingState, FormData>(
    updateTenantBillingSettingsAction,
    undefined
  );
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState(initialBaseMonthlyPrice.toFixed(2));
  const [perVehicleMonthlyPrice, setPerVehicleMonthlyPrice] = useState(
    initialPerVehicleMonthlyPrice.toFixed(2)
  );

  useEffect(() => {
    setBaseMonthlyPrice(initialBaseMonthlyPrice.toFixed(2));
  }, [initialBaseMonthlyPrice]);

  useEffect(() => {
    setPerVehicleMonthlyPrice(initialPerVehicleMonthlyPrice.toFixed(2));
  }, [initialPerVehicleMonthlyPrice]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="base-monthly-price" className="text-sm font-medium">
            Fixed monthly price
          </label>
          <Input
            id="base-monthly-price"
            name="baseMonthlyPrice"
            type="number"
            min="0"
            step="0.01"
            value={baseMonthlyPrice}
            onChange={(event) => setBaseMonthlyPrice(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="per-vehicle-monthly-price" className="text-sm font-medium">
            Monthly price per car
          </label>
          <Input
            id="per-vehicle-monthly-price"
            name="perVehicleMonthlyPrice"
            type="number"
            min="0"
            step="0.01"
            value={perVehicleMonthlyPrice}
            onChange={(event) => setPerVehicleMonthlyPrice(event.target.value)}
            required
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Invoice generation charges the full monthly per-car price for every tenant car that existed at any point in the billed month.
      </p>

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
        {pending ? "Saving..." : "Save billing settings"}
      </Button>
    </form>
  );
}

export function GenerateTenantInvoiceForm({
  tenantId,
  defaultBillingMonth,
}: {
  tenantId: string;
  defaultBillingMonth: string;
}) {
  const [state, action, pending] = useActionState<TenantBillingState, FormData>(
    generateTenantInvoiceAction,
    undefined
  );
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth);

  useEffect(() => {
    setBillingMonth(defaultBillingMonth);
  }, [defaultBillingMonth]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />

      <div className="space-y-1.5">
        <label htmlFor="billing-month" className="text-sm font-medium">
          Billing month
        </label>
        <Input
          id="billing-month"
          name="billingMonth"
          type="month"
          value={billingMonth}
          onChange={(event) => setBillingMonth(event.target.value)}
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        The invoice stores a snapshot of that month’s per-car count and current pricing. If an invoice already exists for the selected month, creation is blocked.
      </p>

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
        {pending ? "Creating..." : "Create invoice"}
      </Button>
    </form>
  );
}
