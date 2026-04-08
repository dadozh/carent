# Multi-Tenancy & Role-Based Security Plan

## Status legend
- `[ ]` not started
- `[~]` in progress
- `[x]` done

---

## Architecture decisions

### Auth stack
- **JWT (stateless)** via `jose` — session cookie carries `{ userId, tenantId, role }`
- **bcryptjs** — password hashing (pure JS, no native deps)
- No external auth service — full control, works with existing SQLite setup
- httpOnly cookie, signed with `AUTH_SECRET` env var

### Multi-tenancy model
- **Shared DB, `tenant_id` column** on every data table
- Every DB function takes `tenantId` from the validated session — never from the request body
- `middleware.ts` validates the JWT and rejects requests before they reach route handlers

### Roles
| Role | Description |
|------|-------------|
| `super_admin` | Platform-wide: manage tenants, impersonate |
| `tenant_admin` | Full access within their tenant (fleet, reservations, users, settings) |
| `manager` | Reservations (full CRUD), fleet (read + status), reports |
| `agent` | Create + view reservations only |
| `viewer` | Read-only across fleet and reservations |

### URL structure (path-based, no wildcard DNS needed)
- `/login` — public
- `/(admin)/*` — requires auth, role ≥ `agent`
- `/platform/*` — requires `super_admin`
- `/(public)/book` — public but tenant-scoped (shareable link with tenant slug)
- All `/api/*` — require auth except public booking endpoint

---

## Phase 1 — Auth foundation
> Goal: secure the app for a single tenant before adding multi-tenant complexity.

- [x] **1.1** Install `jose` and `bcryptjs` + `@types/bcryptjs`
- [x] **1.2** Create `lib/auth-db.ts` — `tenants` and `users` tables, seed default tenant + admin user
- [x] **1.3** Create `lib/session.ts` — `createSession`, `verifySession`, `deleteSession` using `jose` + httpOnly cookie
- [x] **1.4** Create `middleware.ts` — protect `/(admin)` and `/api` routes; redirect to `/login` if no valid session
- [x] **1.5** Create `app/login/page.tsx` — email/password form with server action
- [x] **1.6** Create `app/login/actions.ts` — server action: validate credentials, issue session cookie
- [x] **1.7** Add logout endpoint `app/api/auth/logout/route.ts`
- [x] **1.8** Update admin layout header — show logged-in user name + logout button
- [x] **1.9** Print default credentials to console on first boot so admin can log in

## Phase 2 — Tenant isolation in DB
> Goal: every row in every table is scoped to a tenant; cross-tenant reads are structurally impossible.

- [x] **2.1** Add `tenant_id` column to `vehicles`, `customers`, `reservations` tables (migration on startup); `reservations` migrated to composite `(tenant_id, id)` PK for per-tenant sequential IDs
- [x] **2.2** Update all functions in `lib/rental-db.ts` to accept and filter by `tenantId`
- [x] **2.3** Update all functions in `lib/vehicle-db.ts` to accept and filter by `tenantId`
- [x] **2.4** Backfill existing rows with the default tenant ID (SQLite DEFAULT handles existing rows; seed script updated to include `tenant_id`)
- [x] **2.5** Update all API route handlers to extract `tenantId` from `x-tenant-id` session header and pass to DB functions
- [x] **2.6** Client hooks unchanged — they call API routes, isolation enforced server-side
- [x] **2.7** Unit tests for tenant isolation (`__tests__/vehicle-db.test.ts`, `__tests__/rental-db.test.ts`) — 16 tests passing

## Phase 3 — Role-based access control
> Goal: each role sees and can do only what it's permitted to.

- [x] **3.1** Create `lib/permissions.ts` — permission matrix, `can(role, action)` helper; 7 actions, 5 roles ordered by privilege level
- [x] **3.2** Add role checks to every API handler via `assertCan(role, action)`; shared `lib/api-session.ts` helper extracts tenantId + role from headers
- [x] **3.3** `proxy.ts` (renamed from deprecated `middleware.ts`) enforces `/platform` = super_admin only; `can()` checks in API handlers cover per-action RBAC
- [x] **3.4** `lib/role-context.tsx` — `RoleProvider` wraps admin layout; `useCan(action)` hook available to all client components
- [x] **3.5** "New booking", cancel, swap buttons hidden by role in reservations page
- [x] **3.6** "Add vehicle" and "Edit" buttons hidden by role in fleet pages
- [x] **3.7** Unit tests for permission matrix (`__tests__/permissions.test.ts`) — 28 tests total passing

## Phase 4 — User management
> Goal: tenant admins can invite/manage their own staff without needing platform access.

- [x] **4.1** Create `app/(admin)/settings/users/page.tsx` — list users in tenant
- [x] **4.2** Add invite user form — create user with temp password, role selector
- [x] **4.3** Add deactivate/reactivate user action
- [x] **4.4** Add change role action
- [x] **4.5** Allow user to change their own password from a profile page

### Phase 4 implementation notes
- User management lives at `/settings/users`; self-service account management lives at `/profile`
- Only `tenant_admin` can access `/settings/users`; all authenticated users can access `/profile`
- Invite flow creates the user immediately with a generated temporary password shown once in the UI
- Allowed tenant-managed roles are `tenant_admin`, `manager`, `agent`, `viewer` — not `super_admin`
- Tenant admins cannot edit their own role/active state from the user-management screen
- The last active `tenant_admin` in a tenant cannot be demoted or deactivated
- Session validation now re-hydrates the current user from the DB on each request, so role changes and deactivation take effect without waiting for JWT expiry
- Coverage added for tenant-scoped user listing, role changes, activation toggles, and active-admin counting in `__tests__/auth-db.test.ts`

## Phase 5 — Tenant management (super admin)
> Goal: platform admin can create and manage tenants.

- [x] **5.1** Create `app/platform/page.tsx` — tenant list with status, plan, user count
- [x] **5.2** Create `app/platform/tenants/new/page.tsx` — create tenant + initial admin user
- [x] **5.3** Add enable/disable tenant action
- [x] **5.4** Add impersonate tenant action (sets `tenantId` in session temporarily)

### Phase 5 implementation notes
- Platform admin UI lives at `/platform`; tenant creation form lives at `/platform/tenants/new`
- A default `super_admin` account is now seeded on startup: `platform@carent.com` / `admin1234`
- Tenant creation provisions both the tenant row and an initial `tenant_admin` user in one action
- Tenant list shows `plan`, `status`, total users, and active-user count
- `super_admin` impersonation is implemented by changing the effective `tenantId` in the session while keeping the real user identity and role from the DB
- Session verification rejects impersonation for non-`super_admin` users and revalidates both the real home tenant and the effective tenant on each request
- Disabled tenants cannot be impersonated or used for login
- A `super_admin` cannot disable the tenant currently bound to their session; if impersonating, they must stop impersonation first
- Coverage added for tenant creation with initial admin, tenant stats, and tenant activation state in `__tests__/auth-db.test.ts`

## Phase 6 — Public booking isolation
> Goal: each tenant has a shareable public booking URL scoped to their fleet.

- [x] **6.1** Add `slug` to tenant (e.g. `acme`) — used in public booking URL
- [x] **6.2** Create `/book/[tenantSlug]` route (or query param `?t=slug`) — resolves tenant from slug, no login needed
- [x] **6.3** Public booking API endpoints accept tenant slug token instead of staff JWT
- [x] **6.4** Redirect legacy `/book` to default tenant for backwards compat

### Phase 6 implementation notes
- Public booking now lives at `/book/[tenantSlug]`; legacy `/book` redirects to the default tenant slug
- Auth proxy explicitly allows `/book/*` and `/api/public/*` without a staff session
- Public booking data and booking creation use `/api/public/book/[tenantSlug]`, which resolves the tenant from the slug server-side
- Public vehicle listings are tenant-scoped and filtered to `available` vehicles only; when dates are provided, vehicles blocked by overlapping `pending` / `confirmed` / `active` reservations are excluded
- Public booking creates a real `pending` reservation in the resolved tenant instead of a mock confirmation screen
- Public booking creates or reuses a tenant-scoped customer record and never accepts `tenantId` from the client
- Disabled tenants are not resolved by slug for public booking, login, or impersonation
- Coverage added for tenant-scoped public booking creation in `__tests__/rental-db.test.ts`

## Phase 7 — Tenant settings
> Goal: each tenant configures their own locations, extras, branding.

- [x] **7.1** Move hardcoded locations ("Airport", "Downtown") to `tenants.settings` JSON
- [x] **7.2** Move extras (GPS, Wi-Fi, Child Seat) to `tenants.settings`
- [x] **7.3** Create `app/(admin)/settings/page.tsx` — tenant admin can edit settings
- [x] **7.4** Read locations and extras from tenant settings in booking wizard and public booking

### Phase 7 implementation notes
- Tenant settings are stored in `tenants.settings` JSON and normalized to `{ locations: string[], extras: string[] }`
- Default tenant settings remain `["Airport", "Downtown"]` for locations and `["GPS", "Wi-Fi", "Child Seat"]` for extras when a tenant has not customized them yet
- Tenant admin settings UI lives at `/settings`
- Settings reads/writes are exposed through `/api/tenant-settings` for client-side booking flows and validated server-side for tenant-admin updates
- Staff booking (`/(admin)/reservations`) and public booking (`/book/[tenantSlug]`) now read locations and extras from tenant settings instead of hardcoded arrays
- Reservation creation validates pickup/return locations and extras against the current tenant settings
- Coverage added for tenant settings defaults/updates in `__tests__/auth-db.test.ts` and settings-driven reservation validation in `__tests__/rental-db.test.ts`

---

## Data model additions

### `tenants` table
```sql
CREATE TABLE IF NOT EXISTS tenants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'trial',
  settings   TEXT NOT NULL DEFAULT '{}',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

### `users` table
```sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
)
```

### Session payload (JWT claims)
```typescript
{
  userId:   string
  tenantId: string
  role:     'super_admin' | 'tenant_admin' | 'manager' | 'agent' | 'viewer'
  name:     string
  email:    string
}
```

---

## Out of scope (future)
- Subscription billing (Stripe)
- Email delivery (invites, booking confirmations)
- Two-factor authentication
- OAuth / SSO (Google, Microsoft)
- Per-tenant rate limiting
- Audit log (who changed what)
- Real-time multi-user sync
- Subdomain routing (`tenant.app.com`)

## Implemented after the main plan

### Basic tenant billing and monthly invoices
- `super_admin` can open `/platform/tenants/[tenantId]/billing`
- Each tenant has billing settings:
  - fixed monthly price
  - monthly price per car
- Monthly invoices are generated manually and stored as immutable snapshots
- Invoice generation counts tenant cars that existed at any point in the billed month
- Vehicle month counting uses vehicle creation date plus the timestamp when a vehicle becomes `retired`
- Only one invoice per tenant per billing month is allowed
