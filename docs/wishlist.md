# Feature Wishlist

Deferred features that would add significant value but are not required for an MVP back-office operation. Items are roughly ordered by business impact.

---

## Notifications

- **Email confirmations** — send a confirmation email to the customer when a reservation is created or updated (status change, extension, etc.)
- **Overdue return alerts** — automatically email the responsible agent when a vehicle has not been returned past the agreed time
- **Payment reminders** — notify staff when an active or completed reservation has no payment recorded

---

## Financial & Billing

- **Security deposit tracking** — record whether a deposit was collected, the amount, and when/if it was refunded
- **Multi-currency support** — display and store amounts in the tenant's configured currency instead of hard-coded EUR
- **Rate variations** — weekly and monthly discount tiers (e.g. 10% off for 7+ days), seasonal pricing, promotional codes
- **Invoice / receipt generation** — printable PDF receipt for customers (distinct from the rental contract)
- **Payment methods** — support card and bank-transfer tracking in addition to cash; record card-last-four / transaction reference

---

## Customer & Contract Management

- **Signed contract tracking** — record whether a signed contract has been collected (digital or paper) and store a scan reference
- **Customer blacklist / notes** — flag customers with a risk rating or internal notes visible to staff before confirming a booking
- **Customer portal** — self-service area for customers to view their booking history (not a priority while back-office only)

---

## Fleet & Operations

- **Return photo upload UI** — the data model already has `returnPhotos[]` on `ReturnChecklist`; only the upload UI is missing
- **Scheduled maintenance reminders** — alert when a vehicle is approaching its next service date or mileage threshold
- **Fuel cost tracking** — record the cost of refuelling on return, automatically propose it as an extra charge

---

## Platform & Infrastructure

- **Automated status transitions** — scheduler that moves `pending → confirmed` or flags overdue items without requiring manual staff action
- **SQLite backup strategy** — periodic snapshots to object storage (S3-compatible) with configurable retention
- **Audit log** — immutable log of who changed what and when (status changes, payment, swap, return checklist) for compliance and dispute resolution
- **Role-based dashboard widgets** — show different widgets based on the logged-in user's role (e.g. agents see pending tasks, managers see revenue)

---

## Reporting

- **Revenue by vehicle** — rank vehicles by revenue generated in a selected period
- **Customer lifetime value** — total spent and number of rentals per customer, sortable list
- **Export to CSV / Excel** — allow managers to export reservation lists and revenue summaries for external reporting
