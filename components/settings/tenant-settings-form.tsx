"use client";

import { useActionState } from "react";
import { updateTenantSettingsAction, type TenantSettingsState } from "@/app/(admin)/settings/actions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const CURRENCIES = [
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "RSD", label: "Serbian Dinar (RSD)" },
  { code: "BAM", label: "Bosnian Convertible Mark (BAM)" },
];

export function TenantSettingsForm({
  initialLocations,
  initialExtras,
  initialCurrency,
}: {
  initialLocations: string[];
  initialExtras: string[];
  initialCurrency: string;
}) {
  const [state, action, pending] = useActionState<TenantSettingsState, FormData>(updateTenantSettingsAction, undefined);
  const { t } = useI18n();

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="tenant-currency" className="text-sm font-medium">
          Currency
        </label>
        <select
          id="tenant-currency"
          name="currency"
          defaultValue={initialCurrency}
          disabled={pending}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Used for all price displays across the tenant.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tenant-locations" className="text-sm font-medium">
          {t("settings.tenant.locations")}
        </label>
        <textarea
          id="tenant-locations"
          name="locations"
          defaultValue={initialLocations.join("\n")}
          rows={5}
          className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          {t("settings.tenant.locationsHelp")}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="tenant-extras" className="text-sm font-medium">
          {t("settings.tenant.extras")}
        </label>
        <textarea
          id="tenant-extras"
          name="extras"
          defaultValue={initialExtras.join("\n")}
          rows={5}
          className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          {t("settings.tenant.extrasHelp")}
        </p>
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {t(state.success)}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("settings.tenant.saving") : t("settings.tenant.save")}
      </Button>
    </form>
  );
}
