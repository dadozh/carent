import { describe, expect, it } from "vitest";
import {
  assertUploadScope,
  buildTenantUploadPrefix,
  canUploadToScope,
  getTenantIdFromUploadPath,
  type UploadScope,
} from "@/lib/upload-policy";

describe("upload-policy", () => {
  it("builds tenant-scoped prefixes for supported upload scopes", () => {
    const scopes: UploadScope[] = ["vehicles", "customers", "reservations"];
    expect(scopes.map((scope) => buildTenantUploadPrefix("tenant_a", scope))).toEqual([
      "tenants/tenant_a/vehicles",
      "tenants/tenant_a/customers",
      "tenants/tenant_a/reservations",
    ]);
  });

  it("extracts the tenant id from tenant-scoped upload paths", () => {
    expect(getTenantIdFromUploadPath("tenants/acme/vehicles/file.png")).toBe("acme");
    expect(getTenantIdFromUploadPath("tenants/acme/customers/subdir/file.png")).toBe("acme");
  });

  it("rejects non-tenant-scoped upload paths", () => {
    expect(() => getTenantIdFromUploadPath("vehicles/file.png")).toThrow("tenant-scoped");
  });

  it("accepts only supported upload scopes", () => {
    expect(assertUploadScope("vehicles")).toBe("vehicles");
    expect(() => assertUploadScope("reports")).toThrow("Invalid upload scope");
  });

  it("maps fleet uploads to fleet permissions", () => {
    expect(canUploadToScope("manager", "vehicles")).toBe(true);
    expect(canUploadToScope("agent", "vehicles")).toBe(false);
  });

  it("maps reservation and customer uploads to reservation permissions", () => {
    expect(canUploadToScope("agent", "customers")).toBe(true);
    expect(canUploadToScope("agent", "reservations")).toBe(true);
    expect(canUploadToScope("viewer", "customers")).toBe(false);
  });
});
