import { isLocale, type Locale } from "@/lib/i18n-config";

export interface LocationEntry {
  key: string;
  labels: Partial<Record<Locale, string>>;
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function slugifyLocationKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function normalizeLocationEntries(value: unknown): LocationEntry[] {
  if (!Array.isArray(value)) return [];

  const locations: LocationEntry[] = [];
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

    locations.push({ key: derivedKey, labels: normalizedLabels });
    seenKeys.add(derivedKey);
  }

  return locations;
}

export function resolveLocationLabel(
  key: string,
  locale: Locale,
  locations: LocationEntry[]
): string {
  const entry = locations.find((location) => location.key === key);
  return entry?.labels[locale] ?? entry?.labels.en ?? key;
}

export function getLocationKeys(locations: LocationEntry[]): string[] {
  return uniqueNonEmpty(locations.map((location) => location.key));
}

export function hasLocationKey(locations: LocationEntry[], key: string): boolean {
  return getLocationKeys(locations).includes(key);
}
