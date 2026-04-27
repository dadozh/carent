# Location Translations Plan

## Problem

Booking locations are stored as plain strings (`text[]`) in `tenant_settings.locations`.
Display-time translation is hardcoded in two places:
- `app/(admin)/reservations/page.tsx` — hardcoded `locationLabels` map (only Airport, Downtown)
- `lib/contract-pdf.ts` — hardcoded `locationLabels` table (Airport, Downtown, Workshop, Storage)

Tenant-defined locations outside those four values are never translated.

## Target Data Model

### LocationEntry type (new — `lib/location.ts`)
```ts
export interface LocationEntry {
  key: string;                         // canonical ID, stored on reservations
  labels: Partial<Record<Locale, string>>;  // tenant-provided display names per locale
}
```

### DB schema change (`lib/db/schema.ts`)
```ts
// before
locations: text("locations").array().notNull().default([])
// after
locations: jsonb("locations").notNull().default([])   // LocationEntry[]
```

`reservations.pickup_location` and `return_location` keep storing the **key** string —
no reservation column changes needed (existing values become keys after migration).

## Migration (`drizzle/0006_location_translations.sql`)

Convert existing `text[]` values to `jsonb LocationEntry[]`, using each existing
string as both the `key` and the `en` label; `sr` label defaults to the same value
(tenant will fill in SR translations via settings UI).

```sql
ALTER TABLE tenant_settings
  ALTER COLUMN locations TYPE jsonb
  USING (
    SELECT jsonb_agg(
      jsonb_build_object('key', elem, 'labels', jsonb_build_object('en', elem, 'sr', elem))
    )
    FROM unnest(locations) AS elem
  );
ALTER TABLE tenant_settings ALTER COLUMN locations SET DEFAULT '[]'::jsonb;
```

## New Helper (`lib/location.ts`)

```ts
export function resolveLocationLabel(
  key: string,
  locale: Locale,
  locations: LocationEntry[]
): string {
  const entry = locations.find((l) => l.key === key);
  return entry?.labels[locale] ?? entry?.labels["en"] ?? key;
}

export function slugifyLocationKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
```

## Settings UI (`components/settings/tenant-settings-form.tsx`)

Replace textarea with a dynamic list:
- One row per location entry
- One text input per **active UI language** (from `initialUiLanguages`)
- EN input also sets/updates the key (slugified) on creation
- Add row / remove row buttons
- Form submits as JSON (not a flat textarea)

The form `action` (server action) receives the JSON and saves `LocationEntry[]`.

## Touch Points to Update

| File | Change |
|---|---|
| `lib/db/schema.ts` | `locations` column: `text[].array()` → `jsonb` |
| `lib/auth-db.ts` | `TenantSettings.locations`: `string[]` → `LocationEntry[]`; `DEFAULT_TENANT_SETTINGS` |
| `app/(admin)/settings/actions.ts` | Parse `LocationEntry[]` from form JSON instead of `parseList()` |
| `app/api/tenant-settings/route.ts` | Accept/return `LocationEntry[]` |
| `components/settings/tenant-settings-form.tsx` | New per-location per-language UI |
| `app/(admin)/reservations/page.tsx` | Remove hardcoded `locationLabels`; use `resolveLocationLabel` |
| `lib/contract-pdf.ts` | Remove hardcoded `locationLabels`; accept `locations: LocationEntry[]`; use `resolveLocationLabel` |
| `app/api/reservations/[id]/contract/route.ts` | Pass `settings.locations` to PDF generator |
| `app/api/contract-templates/[language]/preview/route.ts` | Pass `settings.locations` to PDF generator |
| `lib/i18n.tsx` | Update `settings.tenant.locationsHelp` copy |

## Key Decisions

- **Key is set once on creation** (slugified EN label) and never changes — reservations
  referencing the key stay valid even if labels are edited later.
- **Fallback chain**: locale label → EN label → raw key — nothing ever breaks if a
  translation is missing.
- **No reservation migration needed** — existing `pickup_location` values like `"Airport"`
  become the keys in the new `LocationEntry` rows, so existing records resolve correctly.
