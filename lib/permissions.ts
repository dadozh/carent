import type { UserRole } from "@/lib/auth-db";

/**
 * Permission actions used throughout the app.
 *
 * read              — view any data (fleet, reservations, customers)
 * writeReservation  — create reservations
 * cancelReservation — cancel active/confirmed reservations
 * swapVehicle       — swap vehicle mid-rental
 * extendReservation — extend the return date of an active reservation
 * completeReturn    — complete a vehicle return (closes rental, updates vehicle)
 * manageFleet       — add / edit / delete vehicles
 * manageUsers       — invite, deactivate, change roles (tenant admin scope)
 * manageSettings    — edit tenant settings like booking locations and extras
 * accessPlatform    — platform-wide super admin area
 */
export type Action =
  | "read"
  | "writeReservation"
  | "cancelReservation"
  | "swapVehicle"
  | "extendReservation"
  | "completeReturn"
  | "manageFleet"
  | "manageUsers"
  | "manageSettings"
  | "accessPlatform";

/** Minimum role required for each action (roles are ordered by privilege level). */
const ROLE_ORDER: UserRole[] = [
  "viewer",
  "agent",
  "manager",
  "tenant_admin",
  "super_admin",
];

const REQUIRED_ROLE: Record<Action, UserRole> = {
  read:               "viewer",
  writeReservation:   "agent",
  cancelReservation:  "manager",
  swapVehicle:        "manager",
  extendReservation:  "agent",
  completeReturn:     "agent",
  manageFleet:        "manager",
  manageUsers:        "tenant_admin",
  manageSettings:     "tenant_admin",
  accessPlatform:     "super_admin",
};

function roleLevel(role: UserRole): number {
  const idx = ROLE_ORDER.indexOf(role);
  return idx === -1 ? -1 : idx;
}

/** Returns true if `role` is allowed to perform `action`. */
export function can(role: UserRole | string, action: Action): boolean {
  const required = REQUIRED_ROLE[action];
  return roleLevel(role as UserRole) >= roleLevel(required);
}

/** Throws a 403-flavored error if the role cannot perform the action. */
export function assertCan(role: UserRole | string, action: Action): void {
  if (!can(role, action)) {
    throw new Error(`Forbidden: role '${role}' cannot perform '${action}'`);
  }
}
