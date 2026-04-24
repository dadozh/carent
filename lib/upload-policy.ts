import { can, type Action } from "@/lib/permissions";

export const UPLOAD_SCOPES = ["vehicles", "customers", "reservations", "logos"] as const;

export type UploadScope = (typeof UPLOAD_SCOPES)[number];

const UPLOAD_SCOPE_ACTION: Record<UploadScope, Action> = {
  vehicles: "manageFleet",
  customers: "writeReservation",
  reservations: "writeReservation",
  logos: "manageSettings",
};

export function isUploadScope(value: string): value is UploadScope {
  return (UPLOAD_SCOPES as readonly string[]).includes(value);
}

export function assertUploadScope(value: string): UploadScope {
  if (!isUploadScope(value)) {
    throw new Error("Invalid upload scope");
  }

  return value;
}

export function getUploadAction(scope: UploadScope): Action {
  return UPLOAD_SCOPE_ACTION[scope];
}

export function canUploadToScope(role: string, scope: UploadScope): boolean {
  return can(role, getUploadAction(scope));
}

export function buildTenantUploadPrefix(tenantId: string, scope: UploadScope): string {
  const normalizedTenantId = tenantId.trim();
  if (!normalizedTenantId) throw new Error("Tenant id is required");
  return `tenants/${normalizedTenantId}/${scope}`;
}

export function getTenantIdFromUploadPath(relativePath: string): string {
  const segments = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 3 || segments[0] !== "tenants") {
    throw new Error("Upload path is not tenant-scoped");
  }

  return segments[1];
}
