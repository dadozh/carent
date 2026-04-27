"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractTemplates } from "@/lib/use-contract-templates";
import { ALL_LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n-config";
import { useI18n } from "@/lib/i18n";

export function ContractTemplatesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { templates, enabledLanguages, defaultLanguage, loading, updateLanguageSettings } = useContractTemplates();
  const [localEnabledLanguages, setLocalEnabledLanguages] = useState<Locale[]>([]);
  const [localDefaultLanguage, setLocalDefaultLanguage] = useState<Locale>("en");
  const [savingLanguages, setSavingLanguages] = useState(false);
  const [languageMessage, setLanguageMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setLocalEnabledLanguages(enabledLanguages);
    setLocalDefaultLanguage(defaultLanguage);
  }, [loading, enabledLanguages, defaultLanguage]);

  async function handleSaveLanguages() {
    setSavingLanguages(true);
    setLanguageMessage(null);
    try {
      const effectiveDefault = localEnabledLanguages.includes(localDefaultLanguage)
        ? localDefaultLanguage
        : localEnabledLanguages[0];
      await updateLanguageSettings(localEnabledLanguages, effectiveDefault ?? localDefaultLanguage);
      setLanguageMessage(t("settings.contracts.languagesSaved"));
    } catch (error) {
      setLanguageMessage(error instanceof Error ? error.message : t("settings.contracts.languagesSaveError"));
    } finally {
      setSavingLanguages(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.contracts.title")}</h1>
        <p className="text-muted-foreground">{t("settings.contracts.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.contracts.languages")}</CardTitle>
          <CardDescription>{t("settings.contracts.languagesHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <>
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {ALL_LOCALES.map((locale) => {
                  const template = templates.find((tmpl) => tmpl.language === locale);
                  const isEnabled = localEnabledLanguages.includes(locale);
                  return (
                    <div
                      key={locale}
                      onClick={() => template && router.push(`/settings/contracts/${locale}`)}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 border-border ${template ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 cursor-pointer"
                        checked={isEnabled}
                        disabled={!template?.published}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setLocalEnabledLanguages([...localEnabledLanguages, locale]);
                          } else {
                            const next = localEnabledLanguages.filter((l) => l !== locale);
                            setLocalEnabledLanguages(next);
                            if (localDefaultLanguage === locale && next.length) setLocalDefaultLanguage(next[0]);
                          }
                          setLanguageMessage(null);
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{LOCALE_LABELS[locale]}</span>
                      <div className="flex shrink-0 items-center gap-1 text-[10px]">
                        {template ? (
                          <span className={`rounded-full px-1.5 py-0.5 ${template.published ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
                            {template.published ? t("settings.contracts.publishedStatus") : t("settings.contracts.draftOnly")}
                          </span>
                        ) : null}
                        {isEnabled ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                            {locale === localDefaultLanguage ? t("settings.contracts.enabledDefault") : t("settings.contracts.enabled")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="default-contract-language" className="text-sm font-medium">
                  {t("settings.tenant.defaultLanguage")}
                </label>
                <select
                  id="default-contract-language"
                  value={localDefaultLanguage}
                  onChange={(event) => { setLocalDefaultLanguage(event.target.value as Locale); setLanguageMessage(null); }}
                  className="rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {localEnabledLanguages.map((locale) => (
                    <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={handleSaveLanguages} disabled={savingLanguages || localEnabledLanguages.length === 0}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {savingLanguages ? t("common.loading") : t("common.save")}
                </Button>
                {languageMessage ? <p className="text-sm text-muted-foreground">{languageMessage}</p> : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.contracts.publishRules")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("settings.contracts.publishRuleEnabled")}</p>
          <p>{t("settings.contracts.publishRuleArchive")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
