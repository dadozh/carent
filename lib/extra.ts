import { isLocale, type Locale } from "@/lib/i18n-config";
import { slugifyLocationKey } from "@/lib/location";

export interface ExtraEntry {
  key: string;
  labels: Partial<Record<Locale, string>>;
  price: number;
}

export function normalizeExtraEntries(value: unknown): ExtraEntry[] {
  if (!Array.isArray(value)) return [];

  const extras: ExtraEntry[] = [];
  const seenKeys = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const candidateKey = typeof item.key === "string" ? item.key.trim() : "";
    const rawLabels = item.labels;
    const labels: Partial<Record<Locale, string>> = {};

    if (rawLabels && typeof rawLabels === "object") {
      for (const [locale, label] of Object.entries(rawLabels)) {
        if (!isLocale(locale) || typeof label !== "string") continue;
        const trimmed = label.trim();
        if (trimmed) labels[locale] = trimmed;
      }
    }

    const fallbackEnglishLabel = labels.en ?? "";
    const derivedKey = candidateKey || slugifyLocationKey(fallbackEnglishLabel);
    if (!derivedKey || seenKeys.has(derivedKey)) continue;

    const normalizedLabels = Object.fromEntries(
      Object.entries(labels).filter(([, label]) => label.trim())
    ) as Partial<Record<Locale, string>>;

    if (!Object.keys(normalizedLabels).length) {
      normalizedLabels.en = derivedKey;
    }

    const numericPrice = typeof item.price === "number" ? item.price : Number(item.price ?? 0);
    const price = Number.isFinite(numericPrice) && numericPrice >= 0
      ? Math.round(numericPrice * 100) / 100
      : 0;

    extras.push({ key: derivedKey, labels: normalizedLabels, price });
    seenKeys.add(derivedKey);
  }

  return extras;
}

export function resolveExtraLabel(
  key: string,
  locale: Locale,
  extras: ExtraEntry[]
): string {
  const entry = extras.find((extra) => extra.key === key);
  return entry?.labels[locale] ?? entry?.labels.en ?? key;
}

export function hasExtraKey(extras: ExtraEntry[], key: string): boolean {
  return extras.some((extra) => extra.key === key);
}

export function calculateExtraTotal(keys: string[], extras: ExtraEntry[], days = 1): number {
  const dailyTotal = keys.reduce((sum, key) => {
    const entry = extras.find((extra) => extra.key === key);
    return sum + (entry?.price ?? 0);
  }, 0);

  return Math.round(dailyTotal * Math.max(0, days) * 100) / 100;
}
