# Security & Quality Fix Plan

Generated from PR #2 audit. Issues ordered by severity.

---

## 🔴 Critical

### C1 — Middleware not running (`proxy.ts` → `middleware.ts`)
**Status:** DONE

`proxy.ts` contains the JWT auth middleware but Next.js only loads `middleware.ts`.
Result: API routes using `getApiSession()` always throw Unauthorized; headers are
never populated from the JWT, making auth bypassable via forged `x-*` headers.

**Fix:**
- Rename `proxy.ts` → `middleware.ts`
- Change named export `proxy` to default export `middleware`
- Remove now-stale named export reference in `config` (keep as-is, Next.js reads it)

---

## 🟠 High

### H1 — `x-forwarded-for` taken verbatim (IP spoofing in audit logs)
**Status:** DONE

`audit-request.ts` trusts the client-supplied `X-Forwarded-For` header first.
On the Pi behind lighttpd, `x-real-ip` is the trusted proxy-set value.

**Fix:**
- Prefer `x-real-ip` → `cf-connecting-ip` → `x-forwarded-for` (last resort)

### H2 — Public booking endpoint has no input validation or rate limiting
**Status:** DONE (field-length validation added; rate limiting deferred to reverse proxy)

`POST /api/public/book/[tenantSlug]` accepts unauthenticated JSON with no
field-length caps. Enables reservation flooding and oversized-payload storage.

**Fix:**
- Add server-side field validation (max string lengths) at the route boundary
- Validate required fields before calling `createPublicReservation`

### H3 — Hardcoded default credentials (`admin1234`)
**Status:** DONE (random password generated at seed time, printed to stdout + .data/initial-credentials.txt)

`auth-db.ts` seeds `admin@carent.com` and `platform@carent.com` with `admin1234`
on every fresh DB. Weak and predictable; silent in daemonized deploys.

**Fix:**
- Generate a cryptographically random password at seed time
- Print it to stdout AND write it to `.data/initial-credentials.txt` so PM2 log
  captures it and it's recoverable without watching the terminal

---

## 🟡 Medium

### M1 — `setTenantFeatureOverrideAction` doesn't validate `feature` string
**Status:** DONE

Raw form field passed to DB insert. Arbitrary strings stored as feature overrides
silently have no effect but pollute the table.

**Fix:**
- Validate against `PLAN_FEATURE_LIST` feature keys before writing

### M2 — `getUserByEmail` without tenantId is ambiguous across tenants
**Status:** DONE (global unique index on email; createUser now validates email format)

Email uniqueness is per-tenant only. Same email in two tenants → login picks
whichever row SQLite finds first. Ambiguous and inconsistent.

**Fix:**
- Add a DB-level unique index on `email` globally (migration + `addColumnIfMissing`
  equivalent via `CREATE UNIQUE INDEX IF NOT EXISTS`)
- Update `getUserByEmail` to always require `tenantId` in non-login paths,
  or make login use the slug-scoped lookup path

### M3 — `addColumnIfMissing` interpolates table name (unsafe pattern)
**Status:** DONE (AllowedTable union type enforced at compile time)

`PRAGMA table_info(${tableName})` and `ALTER TABLE ${tableName}` use raw string
interpolation. Not exploitable today (hardcoded callers) but dangerous pattern.

**Fix:**
- Add a whitelist check: `const ALLOWED_TABLES = ["audit_logs"] as const`
- Throw if tableName is not in the list

### M4 — `LocalProvider` (base64) used in production with no guard
**Status:** DONE (console.warn added in production; deploy example updated)

`storage.ts` stores images as base64 data URLs in SQLite. No `NODE_ENV` guard.
Pi deployment will silently use this provider and balloon the database.

**Fix:**
- Add a `console.warn` in production when `LocalProvider` is instantiated
- Document in `deploy/carent.env.production.example` that a real storage provider
  is needed before uploading photos

### M5 — `createUser` skips email format validation
**Status:** DONE (fixed as part of M2)

`auth-db.ts:createUser` doesn't validate email format. `createTenantWithAdmin`
does, but direct callers (e.g. user invite flow) bypass it.

**Fix:**
- Move email validation into `createUser` itself

---

## Progress

| ID | Issue | Status |
|----|-------|--------|
| C1 | middleware rename + default export | ✅ DONE |
| H1 | IP spoofing in audit logs | ✅ DONE |
| H2 | public booking input validation | ✅ DONE |
| H3 | hardcoded default credentials | ✅ DONE |
| M1 | feature override key validation | ✅ DONE |
| M2 | getUserByEmail cross-tenant ambiguity | ✅ DONE |
| M3 | addColumnIfMissing table name interpolation | ✅ DONE |
| M4 | LocalProvider production warning | ✅ DONE |
| M5 | createUser email validation | ✅ DONE (via M2) |

### Bonus
| — | payment tracking `payment` field stripped on DB round-trip | ✅ DONE |
