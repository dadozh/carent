<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI Design Priority

Mobile first, tablet second, desktop third. Write CSS and layouts starting from mobile as the base, layer tablet overrides, then desktop.

# Date and Time Formatting

Use European date formatting everywhere in the UI: `dd.MM.yyyy`. Use 24-hour time everywhere: `HH:mm`. Keep HTML form control values and persisted database values in machine-readable ISO-style strings where required, but format dates/times for users at display boundaries.

# test tenants
test-tenant@carent.com
password: Tmp-25c94f69a6!

(super admin)
platform@carent.com
admin1234