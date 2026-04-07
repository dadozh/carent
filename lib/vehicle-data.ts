import rawData from "./data/vehicle-makes-models.json";

type MakeModelData = Record<string, Record<string, number[]>>;

const CUSTOM_KEY = "carent:vehicle-catalog";
const CURRENT_YEAR = new Date().getFullYear();

// Years 2017→current not in the arthurkao dataset — extend all known combos
const EXTENDED_YEARS = Array.from(
  { length: CURRENT_YEAR - 2016 },
  (_, i) => 2017 + i
);

// Standard year range for the European supplement (common rental years)
const EU_YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => 2010 + i);

/**
 * European brands absent from the arthurkao dataset (US-market only source).
 * Models are those commonly found in European rental fleets.
 */
const EUROPEAN_SUPPLEMENT: MakeModelData = {
  SKODA: {
    Fabia:    EU_YEARS,
    Octavia:  EU_YEARS,
    Superb:   EU_YEARS,
    Rapid:    EU_YEARS,
    Scala:    Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => 2019 + i),
    Kamiq:    Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => 2019 + i),
    Karoq:    Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    Kodiaq:   Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    Enyaq:    Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i),
  },
  OPEL: {
    Corsa:      EU_YEARS,
    Astra:      EU_YEARS,
    Insignia:   EU_YEARS,
    Mokka:      EU_YEARS,
    Crossland:  Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    Grandland:  Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    Combo:      EU_YEARS,
    Vivaro:     EU_YEARS,
    Zafira:     EU_YEARS,
  },
  CITROEN: {
    C1:           EU_YEARS,
    C3:           EU_YEARS,
    "C3 Aircross": Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    C4:           EU_YEARS,
    "C4 Cactus":  EU_YEARS,
    C5:           EU_YEARS,
    "C5 Aircross": Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => 2019 + i),
    Berlingo:     EU_YEARS,
    SpaceTourer:  Array.from({ length: CURRENT_YEAR - 2015 }, (_, i) => 2016 + i),
  },
  DACIA: {
    Sandero:  EU_YEARS,
    Logan:    EU_YEARS,
    Duster:   EU_YEARS,
    Lodgy:    EU_YEARS,
    Dokker:   EU_YEARS,
    Jogger:   Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i),
    Spring:   Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i),
  },
  ALFA_ROMEO: {   // ALFA ROMEO exists in base but as two words; add as backup
    Giulia:     Array.from({ length: CURRENT_YEAR - 2015 }, (_, i) => 2016 + i),
    Stelvio:    Array.from({ length: CURRENT_YEAR - 2016 }, (_, i) => 2017 + i),
    Tonale:     Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i),
    "147":      EU_YEARS.filter(y => y <= 2014),
    "156":      EU_YEARS.filter(y => y <= 2012),
    "159":      EU_YEARS.filter(y => y <= 2012),
    Giulietta:  EU_YEARS,
    MiTo:       EU_YEARS,
  },
  LANCIA: {
    Ypsilon: EU_YEARS,
    Delta:   EU_YEARS.filter(y => y <= 2014),
  },
  CUPRA: {
    Formentor: Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i),
    Born:      Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i),
    Ateca:     Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => 2019 + i),
    Leon:      Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i),
  },
  POLESTAR: {
    "Polestar 2": Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i),
    "Polestar 3": Array.from({ length: CURRENT_YEAR - 2023 }, (_, i) => 2024 + i),
  },
  BYD: {
    Atto3:   Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i),
    Han:     Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => 2021 + i),
    Tang:    Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i),
    Dolphin: Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => 2023 + i),
    Seal:    Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => 2023 + i),
  },
};

// Merge base + supplement into one effective dataset
function mergeData(...sources: MakeModelData[]): MakeModelData {
  const result: MakeModelData = {};
  for (const src of sources) {
    for (const [make, models] of Object.entries(src)) {
      if (!result[make]) result[make] = {};
      for (const [model, years] of Object.entries(models)) {
        const existing = new Set<number>(result[make][model] ?? []);
        years.forEach((y) => existing.add(y));
        result[make][model] = Array.from(existing).sort();
      }
    }
  }
  return result;
}

const baseData: MakeModelData = mergeData(rawData as MakeModelData, EUROPEAN_SUPPLEMENT);

function getCustomData(): MakeModelData {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCustomData(data: MakeModelData) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(data));
}

export function getMakes(): string[] {
  const custom = getCustomData();
  const all = new Set([...Object.keys(baseData), ...Object.keys(custom)]);
  return Array.from(all).sort();
}

export function getModels(make: string): string[] {
  const custom = getCustomData();
  const base = Object.keys(baseData[make] ?? {});
  const cust = Object.keys(custom[make] ?? {});
  return Array.from(new Set([...base, ...cust])).sort();
}

export function getYears(make: string, model: string): number[] {
  const custom = getCustomData();
  const baseYears: number[] = baseData[make]?.[model] ?? [];
  const customYears: number[] = custom[make]?.[model] ?? [];
  // If this make/model exists in the base dataset, extend to current year
  const extended = baseYears.length > 0 ? EXTENDED_YEARS : [];
  const all = new Set([...baseYears, ...extended, ...customYears]);
  return Array.from(all).sort((a, b) => b - a); // newest first
}

/** Add a make/model/year combo to the custom catalog (persists to localStorage) */
export function addToCustomCatalog(make: string, model: string, year: number) {
  const data = getCustomData();
  if (!data[make]) data[make] = {};
  if (!data[make][model]) data[make][model] = [];
  if (!data[make][model].includes(year)) {
    data[make][model] = [...data[make][model], year].sort();
  }
  saveCustomData(data);
}

/** Get all custom catalog entries (for the admin catalog manager) */
export function getCustomCatalog(): MakeModelData {
  return getCustomData();
}

/** Remove a model from the custom catalog */
export function removeFromCustomCatalog(make: string, model: string) {
  const data = getCustomData();
  if (data[make]) {
    delete data[make][model];
    if (Object.keys(data[make]).length === 0) delete data[make];
  }
  saveCustomData(data);
}

/** Add a make/model for a range of years (fromYear..toYear inclusive) */
export function addModelRange(make: string, model: string, fromYear: number, toYear: number) {
  const data = getCustomData();
  if (!data[make]) data[make] = {};
  const existing = new Set<number>(data[make][model] ?? []);
  for (let y = fromYear; y <= toYear; y++) existing.add(y);
  data[make][model] = Array.from(existing).sort();
  saveCustomData(data);
}

/** Dataset stats (base + European supplement combined) */
export const BASE_STATS = {
  makes: Object.keys(baseData).length,
  models: Object.values(baseData).reduce((acc, models) => acc + Object.keys(models).length, 0),
  yearFrom: 2001,
  yearTo: CURRENT_YEAR,
} as const;
