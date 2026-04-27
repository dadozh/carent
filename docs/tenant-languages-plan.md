# Plan: Tenant-configurable contract & UI languages

## Scope

Two related but distinct settings, both managed in `/settings`:

1. **Contract languages** — which languages a tenant offers as PDF rental-contract output (`/api/reservations/[id]/contract?lang=…`).
2. **UI languages** — which frontend translations are exposed in the tenant's language switcher.

Available pool for both: `de`, `en`, `sr`, `bs`, `hr`. No real translations are required now — `de`, `bs`, `hr` will fall back to English at the string layer (placeholder label sets / translation maps).

---

## 1. Data model

Extend `tenant_settings` (`lib/db/schema.ts`) with two `text[]` columns plus a default-language scalar for each:

```
contract_languages          text[]  not null default '{en,sr}'
ui_languages                text[]  not null default '{en,sr}'
default_contract_language   text    not null default 'en'
default_ui_language         text    not null default 'en'
```

New migration: `drizzle/0004_tenant_languages.sql`.

Update `TenantSettings` interface and `DEFAULT_TENANT_SETTINGS` in `lib/auth-db.ts:29` and `:77`. Update `getTenantSettings` / `updateTenantSettings` (`lib/auth-db.ts:358`/`:370`) to read/write the four new fields, validating that:

- every selected language ∈ `{de,en,sr,bs,hr}`
- defaults are members of their respective selected sets
- at least one language selected per category

## 2. Shared language constants

In `lib/i18n.tsx:12`, expand `Locale`:

```ts
export type Locale = "de" | "en" | "sr" | "bs" | "hr";
export const ALL_LOCALES: readonly Locale[] = ["de", "en", "sr", "bs", "hr"];
export const LOCALE_LABELS: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  sr: "Srpski",
  bs: "Bosanski",
  hr: "Hrvatski",
};
```

Add stub translation maps for `de`, `bs`, `hr` that re-export the `en` map (single line each). Update `isLocale` and `getInitialLocale` accordingly.

## 3. Settings UI

`components/settings/tenant-settings-form.tsx` gains two new sections (checkbox group + "default" radio/select), submitted as repeated form fields:

```
contractLanguages=de&contractLanguages=en…
defaultContractLanguage=en
uiLanguages=…
defaultUiLanguage=…
```

`app/(admin)/settings/actions.ts:31` parses `formData.getAll(...)`, validates against `ALL_LOCALES`, ensures default ∈ selected, and persists. Audit-log entry includes both lists in `changes`.

Page server (`app/(admin)/settings/page.tsx`) passes the four new values to the client component.

New i18n keys under `settings.tenant.*` for section titles/help text (English + Serbian; others fall through).

## 4. Contract PDF wiring

- `lib/contract-pdf.ts:56` — extend `labels: Record<Locale, ContractLabelSet>`. For `de`/`bs`/`hr`, alias to `en` (`...labels.en`) for now.
- `app/api/reservations/[id]/contract/route.ts:21` — replace the hard `"sr" | "en"` narrowing with: parse `lang`, intersect with the tenant's `contractLanguages`; if missing/invalid, fall back to `defaultContractLanguage`. Currency lookup already calls `getTenantSettings`, so reuse it.
- `app/(admin)/reservations/page.tsx:2092` — replace the two hard-coded buttons with a loop over `tenantContractLanguages` (passed down from the server component / `useTenantSettings`), each linking with `?lang=<code>`. Use `LOCALE_LABELS` and a generic `t("booking.downloadContract")` rendered as `Download contract (DE)` etc.

## 5. Frontend language switcher

- `lib/i18n.tsx` provider gains the tenant's allowed `uiLocales` + `defaultUiLocale`. Source it from the existing `useTenantSettings` hook (`lib/use-tenant-settings.ts`) and pass to the provider in the admin/public layouts.
- `getInitialLocale` clamps stored locale into the allowed set; if outside, returns `defaultUiLocale`.
- `components/layout/header.tsx:61` — replace the binary toggle with a small dropdown (or cycling button) over `uiLocales`. Hide entirely if only one language is enabled.
- Public booking pages (`app/(public)/...`) — same treatment wherever the switcher is used.

## 6. Tests

- Unit: settings action validates language sets and default membership; rejects unknown codes.
- Unit: contract route falls back to `defaultContractLanguage` when `lang` is unsupported by the tenant.
- Unit: i18n provider clamps an out-of-range stored locale to default.

## 7. Migration / rollout

- Backfill: existing rows get `{en,sr}` for both arrays and `en` defaults via the migration's `DEFAULT`.
- No feature flag needed — additive change with safe defaults.

## Critical files (touch list)

- `lib/db/schema.ts`, `drizzle/0004_tenant_languages.sql`
- `lib/auth-db.ts` (`TenantSettings`, defaults, get/update)
- `lib/i18n.tsx` (Locale union, stub maps, provider props, clamp)
- `lib/contract-pdf.ts` (labels map)
- `app/(admin)/settings/page.tsx`, `app/(admin)/settings/actions.ts`
- `components/settings/tenant-settings-page.tsx`, `components/settings/tenant-settings-form.tsx`
- `app/api/reservations/[id]/contract/route.ts`
- `app/(admin)/reservations/page.tsx` (download buttons)
- `components/layout/header.tsx` (switcher)
- `lib/use-tenant-settings.ts` (expose new fields)

## Key tradeoffs

- **Stub translations vs blocking on real ones**: aliasing `de/bs/hr` to English now lets tenants enable/configure end-to-end immediately; risk is users seeing English under a non-English label. Acceptable since explicitly scoped out for now.
- **Two separate fields vs one shared field**: kept separate because contract recipients (customers) and UI users (staff) are different audiences — a tenant may want SR/BS contracts but only EN/SR staff UI.
