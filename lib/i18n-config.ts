export type Locale = "de" | "en" | "sr" | "bs" | "hr";

export const ALL_LOCALES: readonly Locale[] = ["de", "en", "sr", "bs", "hr"];

export const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  sr: "Srpski",
  bs: "Bosanski",
  hr: "Hrvatski",
};

export const DEFAULT_UI_LOCALES: readonly Locale[] = ["en", "sr"];
export const DEFAULT_UI_LOCALE: Locale = "en";
export const LOCALE_COOKIE_KEY = "carent.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return ALL_LOCALES.includes(value as Locale);
}

export function uniqueLocales(values: readonly string[]): Locale[] {
  return [...new Set(values.filter(isLocale))];
}

export function normalizeLocaleSelection(
  values: readonly string[] | null | undefined,
  fallback: readonly Locale[] = DEFAULT_UI_LOCALES
): Locale[] {
  const locales = uniqueLocales(values ?? []);
  return locales.length ? locales : [...fallback];
}

export function normalizeDefaultLocale(
  value: string | null | undefined,
  selectedLocales: readonly Locale[],
  fallback: Locale = DEFAULT_UI_LOCALE
): Locale {
  if (isLocale(value) && selectedLocales.includes(value)) return value;
  if (selectedLocales.includes(fallback)) return fallback;
  return selectedLocales[0] ?? fallback;
}

export function getInitialLocale(
  value: string | null | undefined,
  allowedLocales: readonly Locale[] = DEFAULT_UI_LOCALES,
  defaultLocale: Locale = DEFAULT_UI_LOCALE
): Locale {
  const selectedLocales = normalizeLocaleSelection(allowedLocales, DEFAULT_UI_LOCALES);
  const selectedDefault = normalizeDefaultLocale(defaultLocale, selectedLocales);
  return isLocale(value) && selectedLocales.includes(value) ? value : selectedDefault;
}

export function resolveContractLocale(
  requestedLocale: string | null,
  contractLanguages: readonly Locale[],
  defaultContractLanguage: Locale
): Locale {
  return isLocale(requestedLocale) && contractLanguages.includes(requestedLocale)
    ? requestedLocale
    : defaultContractLanguage;
}
