import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

describe("permissions — can()", () => {
  it("viewer can read", () => {
    expect(can("viewer", "read")).toBe(true);
  });

  it("viewer cannot write reservations", () => {
    expect(can("viewer", "writeReservation")).toBe(false);
  });

  it("agent can write reservations", () => {
    expect(can("agent", "writeReservation")).toBe(true);
  });

  it("agent cannot cancel reservations", () => {
    expect(can("agent", "cancelReservation")).toBe(false);
  });

  it("manager can cancel", () => {
    expect(can("manager", "cancelReservation")).toBe(true);
  });

  it("manager can swap vehicle", () => {
    expect(can("manager", "swapVehicle")).toBe(true);
  });

  it("manager can manage fleet", () => {
    expect(can("manager", "manageFleet")).toBe(true);
  });

  it("manager cannot manage users", () => {
    expect(can("manager", "manageUsers")).toBe(false);
  });

  it("tenant_admin can manage users", () => {
    expect(can("tenant_admin", "manageUsers")).toBe(true);
  });

  it("tenant_admin can manage settings", () => {
    expect(can("tenant_admin", "manageSettings")).toBe(true);
  });

  it("tenant_admin cannot access platform", () => {
    expect(can("tenant_admin", "accessPlatform")).toBe(false);
  });

  it("super_admin can do everything", () => {
    const actions = ["read", "writeReservation", "cancelReservation", "swapVehicle", "manageFleet", "manageUsers", "manageSettings", "accessPlatform"] as const;
    for (const action of actions) {
      expect(can("super_admin", action)).toBe(true);
    }
  });

  it("unknown role is denied", () => {
    expect(can("ghost" as never, "read")).toBe(false);
  });
});
