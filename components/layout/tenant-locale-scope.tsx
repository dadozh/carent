"use client";

import { useEffect } from "react";
import { useI18n, type Locale } from "@/lib/i18n";

export function TenantLocaleScope({
  uiLocales,
  defaultUiLocale,
}: {
  uiLocales: Locale[];
  defaultUiLocale: Locale;
}) {
  const { setLocaleOptions } = useI18n();

  useEffect(() => {
    setLocaleOptions({ uiLocales, defaultUiLocale });
  }, [defaultUiLocale, setLocaleOptions, uiLocales]);

  return null;
}
