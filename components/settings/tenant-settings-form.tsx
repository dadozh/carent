"use client";

import { useActionState } from "react";
import { updateTenantSettingsAction, type TenantSettingsState } from "@/app/(admin)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/lib/i18n";

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
  initialUiLanguages,
  initialDefaultUiLanguage,
}: {
  initialLocations: string[];
  initialExtras: string[];
  initialCurrency: string;
  initialUiLanguages: Locale[];
  initialDefaultUiLanguage: Locale;
}) {
  const [state, action, pending] = useActionState<TenantSettingsState, FormData>(updateTenantSettingsAction, undefined);
  const { t } = useI18n();

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.tenant.localizationTitle")}</CardTitle>
          <CardDescription>{t("settings.tenant.localizationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="tenant-currency" className="text-sm font-medium">
              {t("settings.tenant.currency")}
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
              {t("settings.tenant.currencyHelp")}
            </p>
          </div>

          <LanguageSettingsSection
            title={t("settings.tenant.uiLanguages")}
            help={t("settings.tenant.uiLanguagesHelp")}
            checkboxName="uiLanguages"
            defaultName="defaultUiLanguage"
            initialLanguages={initialUiLanguages}
            initialDefaultLanguage={initialDefaultUiLanguage}
            disabled={pending}
          />

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.tenant.bookingTitle")}</CardTitle>
          <CardDescription>{t("settings.tenant.bookingDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>

      {state?.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(state.error)}
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

function LanguageSettingsSection({
  title,
  help,
  checkboxName,
  defaultName,
  initialLanguages,
  initialDefaultLanguage,
  disabled,
}: {
  title: string;
  help: string;
  checkboxName: string;
  defaultName: string;
  initialLanguages: Locale[];
  initialDefaultLanguage: Locale;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <p className="text-xs text-muted-foreground">{help}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_LOCALES.map((locale) => (
          <label key={locale} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              name={checkboxName}
              value={locale}
              defaultChecked={initialLanguages.includes(locale)}
              disabled={disabled}
              className="h-4 w-4"
            />
            <span>{LOCALE_LABELS[locale]}</span>
          </label>
        ))}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={defaultName} className="text-sm font-medium">
          {t("settings.tenant.defaultLanguage")}
        </label>
        <select
          id={defaultName}
          name={defaultName}
          defaultValue={initialDefaultLanguage}
          disabled={disabled}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ALL_LOCALES.map((locale) => (
            <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
