# Audit Log

## Purpose

The audit log records tenant-scoped mutations across the Carent platform. It is intended for:

- operational traceability
- dispute resolution
- tenant oversight by platform admins
- basic security review of who changed what, from where, and using which browser

The log is immutable from the application UI. Entries are append-only.

## What is captured

Each audit entry stores:

- tenant id
- acting user id
- acting user name
- acting user role
- entity type
- entity id
- action key
- structured detail payload
- request IP address
- request user-agent string
- created timestamp

## Request metadata

Request metadata is captured from request headers at mutation time.

IP address resolution priority:

1. `x-forwarded-for` first value
2. `x-real-ip`
3. `cf-connecting-ip`

Browser information is stored as the raw `user-agent` string. The UI derives a human-readable browser label from it for display.

Because this depends on upstream proxy headers, IP accuracy is only as good as the reverse-proxy configuration in front of the app.

## Tenant scope

Audit entries are always written against a specific tenant.

This means:

- tenant admins only see audit entries for their own tenant
- platform admins can open a tenant-specific audit view from the platform area
- platform actions that target a tenant are logged under that target tenant, so the tenant timeline stays complete

## Covered mutation paths

The audit log currently records:

- reservation creation and reservation lifecycle changes
- vehicle creation and vehicle updates
- customer creation and customer updates
- tenant settings updates
- tenant user invitations, role changes, activation, and deactivation
- password changes
- sign-in and sign-out events
- platform tenant creation
- plan changes
- tenant enable/disable
- impersonation start/stop
- tenant feature override changes
- tenant billing settings changes
- invoice generation

## UI surfaces

Tenant admin audit log:

- route: `/audit`
- respects tenant plan gating already present in the product
- separated into two streams:
  - operations
  - administration

Platform admin tenant audit log:

- route: `/platform/tenants/[tenantId]/audit`
- tenant-specific
- available to super admins
- also separated into operations vs administration streams

Both views support:

- paging
- entity filter
- actor filter
- date range filter

Both views display:

- action
- actor
- timestamp
- IP address
- browser summary
- structured detail data for the mutated entity

## Stream classification

Entries are split into two categories:

- `operations`
  - reservations
  - vehicles
  - customers
- `admin`
  - users
  - tenant settings
  - billing
  - tenant/platform control actions

Older rows without an explicit stored category are classified from `entity_type` at read time, so existing data still appears in the correct stream.

## Structured detail payload

Where possible, audit entries use a structured JSON payload instead of plain text.

Supported fields include:

- `summary`
- `subtitle`
- `metadata[]`
- `note`
- `changes[]`

This allows the UI to show:

- entity identity
- old vs new values
- action-specific metadata such as payment method, return mileage, plan, invoice month, etc.

Older legacy entries may still contain only plain text.

## Database schema

Table: `audit_logs`

Important columns:

- `tenant_id`
- `user_id`
- `user_name`
- `user_role`
- `entity_type`
- `entity_id`
- `action`
- `detail`
- `ip_address`
- `user_agent`
- `created_at`

Schema upgrades are now also available as an explicit deploy-time step via:

```bash
npm run migrate
```

On the Raspberry Pi deployment, both install and upgrade scripts run this command after loading `.env.production`, so audit-log schema changes are applied before PM2 starts the new build.

## Limitations

- This is an application-level audit log, not a full HTTP access log.
- Read-only page views are not logged here.
- IP addresses depend on trusted forwarded headers.
- Browser labels are derived heuristically from the user-agent string.
- Older audit entries created before structured detail support may be less descriptive.

## Extension points

Potential future improvements:

- explicit event ids for correlation with external systems
- export to CSV / JSON
- immutable retention / archival policy
- IP / actor / action search
- signed audit exports for compliance workflows
- optional read-access logging if required by policy
