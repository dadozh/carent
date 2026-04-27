"use client";

import { Globe } from "lucide-react";
import { LOCALE_LABELS, useI18n } from "@/lib/i18n";

export function PublicLanguageSwitcher() {
  const { locale, setLocale, uiLocales, t } = useI18n();

  if (uiLocales.length <= 1) return null;

  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      <Globe className="h-3.5 w-3.5" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        aria-label={t("common.language")}
        className="bg-transparent text-xs font-medium outline-none"
      >
        {uiLocales.map((uiLocale) => (
          <option key={uiLocale} value={uiLocale}>
            {LOCALE_LABELS[uiLocale]}
          </option>
        ))}
      </select>
    </label>
  );
}
