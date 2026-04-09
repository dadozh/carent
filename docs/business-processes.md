# Rental Business Processes

This document describes the supported lifecycle for a rental reservation, from creation through return, including the exception paths (vehicle replacement mid-rental and rental extensions).

---

## Reservation lifecycle

```
[pending] ──confirm──▶ [confirmed] ──activate──▶ [active]
    │                       │                        │
    └──cancel──▶        ──cancel──▶             ┌───┴─────────────────────────────┐
                         [cancelled]             │                                 │
                                                 ├── extend rental ──▶ [active]   │
                                                 │                                 │
                                                 ├── swap vehicle ──▶ [active]    │
                                                 │                                 │
                                                 └── complete return ──▶ [completed]
```

Status changes are one-way. A completed or cancelled reservation cannot be reopened.

---

## 1. Creating a reservation

**Who:** `agent` or higher  
**Where:** Reservations → New Booking

The booking wizard collects:

| Step | Data |
|------|------|
| Dates & location | Pick-up date/time, return date/time, pick-up and return locations |
| Vehicle | Vehicle selection (filtered by availability and absence of date conflicts) |
| Customer | Existing customer lookup or new customer creation (name, email, phone, license number, license expiry, address) |
| Extras | Optional add-ons configured per tenant (GPS, Wi-Fi, Child Seat, …) |
| Summary | Daily rate (auto-filled from vehicle, overridable), total cost, confirmation |

**Validation enforced:**
- Return must be at least 24 hours after pick-up
- Pick-up cannot be in the past
- Customer license must be valid through the return date
- No overlapping reservations on the same vehicle (+ 2-hour turnaround buffer between back-to-back bookings)
- Vehicle must have `status = available`

A custom daily rate can be set per reservation without changing the vehicle's base rate.

---

## 2. Confirming / activating a reservation

Status transitions (`pending → confirmed → active`) are typically done manually by staff. There is no automated scheduler. An agent marks a reservation as active when the customer picks up the vehicle.

When a vehicle is handed to the customer, staff should manually set the vehicle's status to **Rented** in Fleet management.

---

## 3. Cancelling a reservation

**Who:** `manager` or higher  
**Where:** Reservation detail → Cancel reservation

Works on `pending`, `confirmed`, and `active` reservations.

For **active** cancellations (early returns), the form captures:
- Reason (Breakdown / Accident / Early return / No-show / Other)
- Final amount charged (defaults to the original total cost)

The vehicle status must be updated manually in Fleet after an early cancellation.

---

## 4. Replacing a vehicle mid-rental (swap)

**Who:** `manager` or higher  
**Where:** Reservation detail → Replace vehicle  
**Applies to:** `active` reservations only

Used when the current vehicle cannot continue the rental (breakdown, accident) or the customer requests a different vehicle.

### Inputs

| Field | Description |
|-------|-------------|
| Reason type | `breakdown`, `accident`, `customer_request`, or `other` |
| Reason detail | Free-text description |
| Outgoing vehicle notes | Condition/damage notes on the returned vehicle (shown for breakdown/accident) |
| Replacement vehicle | Selected from available fleet |

### What happens automatically

| | Breakdown / Accident | Customer request / Other |
|---|---|---|
| Outgoing vehicle status | → `maintenance` | → `available` |
| Incoming vehicle status | → `rented` | → `rented` |
| Reservation | Vehicle IDs updated, swap logged in history | Same |

The swap is recorded in the reservation's vehicle history and is visible in the detail panel.

---

## 5. Extending a rental

**Who:** `agent` or higher  
**Where:** Reservation detail → Extend rental  
**Applies to:** `active` reservations only

Used when the customer needs to keep the vehicle beyond the originally agreed return date.

### Inputs

| Field | Description |
|-------|-------------|
| New return date | Must be after the current return date |
| New return time | Defaults to original return time |

### Validation

- New return date/time must be strictly after the current return date/time
- No other reservation may conflict with the vehicle in the extended window (existing 2-hour turnaround buffer applies to the new end)

### Cost calculation

`additional_days = ceil((new_end − current_end) / 24h)`  
`additional_cost = additional_days × daily_rate`  
`new_total = current_total + additional_cost`

Multiple extensions are allowed and each is logged with its previous/new dates and additional cost. The extension history is visible in the reservation detail panel.

---

## 6. Completing a vehicle return (return checklist)

**Who:** `agent` or higher  
**Where:** Reservation detail → Complete return  
**Applies to:** `active` reservations only

This is the required close-out step. **A vehicle is not made available again until this checklist is completed.** Staff must not mark a reservation as active for a new customer until the previous rental has been closed through this process.

### Inputs

| Field | Required | Description |
|-------|----------|-------------|
| Return mileage (km) | Yes | Updates the vehicle's odometer |
| Fuel level | Yes | Empty / ¼ / ½ / ¾ / Full |
| Damage to report | Yes | Toggle |
| Damage description | If damaged | Free-text |
| Extra charges (€) | No | Fuel top-up, excess mileage, damage, etc. |
| Return notes | No | Any other observations |

### What happens automatically

| | No damage | Damage reported |
|---|---|---|
| Reservation status | → `completed` | → `completed` |
| Vehicle mileage | Updated to return mileage | Updated to return mileage |
| Vehicle status | → `available` | → `maintenance` |

The return checklist is stored on the reservation and visible in the detail panel for completed reservations.

---

## Vehicle availability gates

A vehicle is blocked from new bookings by **two independent checks**, both of which must be clear:

1. **Vehicle status check** — `status` must be `available`. Set manually in Fleet, or automatically when a return checklist or swap is completed.
2. **Reservation conflict check** — no overlapping `pending/confirmed/active` reservation for the same vehicle (including the 2-hour turnaround buffer after each reservation's end time).

---

## Permission summary

| Action | Minimum role |
|--------|-------------|
| View reservations | `viewer` |
| Create reservation | `agent` |
| Extend rental | `agent` |
| Complete return | `agent` |
| Cancel reservation | `manager` |
| Swap vehicle | `manager` |
| Manage fleet | `manager` |
| Manage users | `tenant_admin` |
| Manage settings | `tenant_admin` |
