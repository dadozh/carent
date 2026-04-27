"use client";

import { useActionState, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { updateTenantSettingsAction, type TenantSettingsState } from "@/app/(admin)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/lib/i18n";
import { slugifyLocationKey, type LocationEntry } from "@/lib/location";

const CURRENCIES = [
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "RSD", label: "Serbian Dinar (RSD)" },
  { code: "BAM", label: "Bosnian Convertible Mark (BAM)" },
];

function getInitialActiveLocales(initialUiLanguages: Locale[]) {
  return initialUiLanguages.includes("en")
    ? initialUiLanguages
    : (["en", ...initialUiLanguages] as Locale[]);
}

function createEmptyLocation(): LocationEntry {
  return { key: "", labels: { en: "" } };
}

function buildLocationTableColumns(localeCount: number) {
  return {
    gridTemplateColumns: `repeat(${localeCount}, minmax(0, 1.4fr)) minmax(7rem, 0.8fr)`,
  };
}

export function TenantSettingsForm({
  initialLocations,
  initialExtras,
  initialCurrency,
  initialUiLanguages,
  initialDefaultUiLanguage,
}: {
  initialLocations: LocationEntry[];
  initialExtras: string[];
  initialCurrency: string;
  initialUiLanguages: Locale[];
  initialDefaultUiLanguage: Locale;
}) {
  const [state, action, pending] = useActionState<TenantSettingsState, FormData>(updateTenantSettingsAction, undefined);
  const { t } = useI18n();
  const [locations, setLocations] = useState<LocationEntry[]>(
    initialLocations.length ? initialLocations : [createEmptyLocation()]
  );
  const [selectedUiLanguages, setSelectedUiLanguages] = useState<Locale[]>(initialUiLanguages);
  const [selectedDefaultUiLanguage, setSelectedDefaultUiLanguage] = useState<Locale>(initialDefaultUiLanguage);
  const activeLocationLocales = useMemo(
    () => getInitialActiveLocales(selectedUiLanguages),
    [selectedUiLanguages]
  );

  function updateLocationLabel(index: number, locale: Locale, value: string) {
    setLocations((current) =>
      current.map((location, currentIndex) => {
        if (currentIndex !== index) return location;

        const nextLabels = { ...location.labels, [locale]: value };
        if (!value.trim()) {
          delete nextLabels[locale];
        }

        const nextLocation: LocationEntry = {
          ...location,
          labels: nextLabels,
        };

        if (locale === "en" && !location.key) {
          nextLocation.key = slugifyLocationKey(value);
        }

        return nextLocation;
      })
    );
  }

  function addLocation() {
    setLocations((current) => [...current, createEmptyLocation()]);
  }

  function removeLocation(index: number) {
    setLocations((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locations" value={JSON.stringify(locations)} />

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
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>{currency.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t("settings.tenant.currencyHelp")}</p>
          </div>

          <LanguageSettingsSection
            title={t("settings.tenant.uiLanguages")}
            help={t("settings.tenant.uiLanguagesHelp")}
            checkboxName="uiLanguages"
            defaultName="defaultUiLanguage"
            selectedLanguages={selectedUiLanguages}
            setSelectedLanguages={setSelectedUiLanguages}
            defaultLanguage={selectedDefaultUiLanguage}
            setDefaultLanguage={setSelectedDefaultUiLanguage}
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
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("settings.tenant.locations")}</label>
              <p className="text-xs text-muted-foreground">{t("settings.tenant.locationsHelp")}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div
                className="hidden border-b border-border bg-muted/40 px-4 py-3 md:grid md:gap-3"
                style={buildLocationTableColumns(activeLocationLocales.length)}
              >
                {activeLocationLocales.map((locale) => (
                  <div
                    key={locale}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {LOCALE_LABELS[locale]}
                  </div>
                ))}
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Action
                </div>
              </div>

              <div className="divide-y divide-border">
              {locations.map((location, index) => (
                <div key={`${location.key || "new"}-${index}`} className="px-4 py-4">
                  <div className="space-y-4 md:hidden">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeLocationLocales.map((locale) => (
                        <div key={locale} className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            {LOCALE_LABELS[locale]}
                          </label>
                          <input
                            type="text"
                            value={location.labels[locale] ?? ""}
                            disabled={pending}
                            onChange={(event) => updateLocationLabel(index, locale, event.target.value)}
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={pending || locations.length === 1}
                        onClick={() => removeLocation(index)}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("settings.tenant.removeLocation")}
                      </button>
                    </div>
                  </div>

                  <div
                    className="hidden items-start gap-3 md:grid"
                    style={buildLocationTableColumns(activeLocationLocales.length)}
                  >
                    {activeLocationLocales.map((locale) => (
                      <div key={locale}>
                        <input
                          type="text"
                          value={location.labels[locale] ?? ""}
                          disabled={pending}
                          onChange={(event) => updateLocationLabel(index, locale, event.target.value)}
                          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={pending || locations.length === 1}
                        onClick={() => removeLocation(index)}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("settings.tenant.removeLocation")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>

            <Button type="button" variant="outline" disabled={pending} onClick={addLocation}>
              <Plus className="h-4 w-4" />
              {t("settings.tenant.addLocation")}
            </Button>
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
            <p className="text-xs text-muted-foreground">{t("settings.tenant.extrasHelp")}</p>
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
        <Save className="h-4 w-4" />
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
  selectedLanguages,
  setSelectedLanguages,
  defaultLanguage,
  setDefaultLanguage,
  disabled,
}: {
  title: string;
  help: string;
  checkboxName: string;
  defaultName: string;
  selectedLanguages: Locale[];
  setSelectedLanguages: Dispatch<SetStateAction<Locale[]>>;
  defaultLanguage: Locale;
  setDefaultLanguage: Dispatch<SetStateAction<Locale>>;
  disabled: boolean;
}) {
  const { t } = useI18n();

  function handleCheckboxChange(locale: Locale, checked: boolean) {
    const nextLanguages = checked
      ? [...new Set([...selectedLanguages, locale])] as Locale[]
      : selectedLanguages.filter((value) => value !== locale);

    setSelectedLanguages(nextLanguages);

    if (!nextLanguages.includes(defaultLanguage)) {
      setDefaultLanguage(nextLanguages[0] ?? "en");
    }
  }

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
              checked={selectedLanguages.includes(locale)}
              disabled={disabled}
              onChange={(event) => handleCheckboxChange(locale, event.target.checked)}
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
          value={defaultLanguage}
          onChange={(event) => setDefaultLanguage(event.target.value as Locale)}
          disabled={disabled}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {(selectedLanguages.length ? ALL_LOCALES.filter((locale) => selectedLanguages.includes(locale)) : ALL_LOCALES).map((locale) => (
            <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
