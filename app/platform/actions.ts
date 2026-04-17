"use server";

import { randomUUID } from "node:crypto";
import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import {
  createTenantInvoice,
  createTenantWithAdmin,
  getTenantBillingSettings,
  getTenantById,
  getTenantByIdIncludingInactive,
  setTenantActive,
  setTenantFeatureOverride,
  updateTenantBillingSettings,
  updateTenantPlan,
} from "@/lib/auth-db";
import { countBillableVehiclesForMonth } from "@/lib/vehicle-db";
import { createSession, verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateTenantState =
  | {
      error?: string;
      success?: string;
      tempPassword?: string;
    }
  | undefined;

export type TenantBillingState =
  | {
      error?: string;
      success?: string;
    }
  | undefined;

async function requireSuperAdmin() {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/");
  return session;
}

function generateTemporaryPassword() {
  return `Tmp-${randomUUID().replace(/-/g, "").slice(0, 10)}!`;
}

export async function createTenantAction(
  _prevState: CreateTenantState,
  formData: FormData
): Promise<CreateTenantState> {
  const session = await requireSuperAdmin();

  const tenantName = `${formData.get("tenantName") ?? ""}`.trim();
  const slug = `${formData.get("slug") ?? ""}`.trim().toLowerCase();
  const plan = `${formData.get("plan") ?? "trial"}`.trim().toLowerCase();
  const adminName = `${formData.get("adminName") ?? ""}`.trim();
  const adminEmail = `${formData.get("adminEmail") ?? ""}`.trim().toLowerCase();
  const tempPassword = generateTemporaryPassword();

  try {
    const { tenant } = createTenantWithAdmin({
      tenantName,
      slug,
      adminName,
      adminEmail,
      adminPassword: tempPassword,
      plan,
    });
    const requestContext = await getAuditRequestContext();
    logAction({
      tenantId: tenant.id,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      entityType: "tenant",
      entityId: tenant.id,
      action: "created_tenant",
      detail: stringifyAuditDetail({
        summary: tenant.name,
        subtitle: `#${tenant.id}`,
        metadata: [
          { key: "tenantSlug", value: tenant.slug },
          { key: "plan", value: tenant.plan },
          { key: "adminEmail", value: adminEmail },
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/platform");
    revalidatePath("/platform/tenants/new");

    return {
      success: `Tenant ${tenantName} created successfully.`,
      tempPassword,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create tenant",
    };
  }
}

export async function setTenantFeatureOverrideAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const feature = `${formData.get("feature") ?? ""}`;
  const value = `${formData.get("value") ?? ""}`;
  const enabled = value === "on" ? true : value === "off" ? false : null;
  setTenantFeatureOverride(tenantId, feature, enabled);
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId,
    userId: session.userId,
    userName: session.name,
    userRole: session.role,
    entityType: "settings",
    entityId: tenantId,
    action: "updated_feature_override",
    detail: stringifyAuditDetail({
      summary: "Feature override",
      subtitle: `#${tenantId}`,
      metadata: [
        { key: "feature", value: feature },
        { key: "value", value: enabled === null ? "plan" : enabled ? "on" : "off" },
      ],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });
  revalidatePath(`/platform/tenants/${tenantId}/billing`);
}

export async function changeTenantPlanAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const plan = `${formData.get("plan") ?? ""}`.trim();
  updateTenantPlan(tenantId, plan);
  const tenant = getTenantByIdIncludingInactive(tenantId);
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId,
    userId: session.userId,
    userName: session.name,
    userRole: session.role,
    entityType: "tenant",
    entityId: tenantId,
    action: "changed_tenant_plan",
    detail: stringifyAuditDetail({
      summary: tenant?.name ?? "Tenant",
      subtitle: `#${tenantId}`,
      metadata: [{ key: "plan", value: plan }],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });
  revalidatePath("/platform");
}

export async function toggleTenantActiveAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const nextActive = `${formData.get("nextActive") ?? ""}` === "true";
  if (!nextActive && tenantId === session.tenantId) {
    throw new Error(session.isImpersonating
      ? "Stop impersonating this tenant before disabling it"
      : "You cannot disable your own home tenant");
  }
  const tenant = setTenantActive(tenantId, nextActive);

  if (!tenant) throw new Error("Tenant not found");
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId,
    userId: session.userId,
    userName: session.name,
    userRole: session.role,
    entityType: "tenant",
    entityId: tenantId,
    action: nextActive ? "enabled_tenant" : "disabled_tenant",
    detail: stringifyAuditDetail({
      summary: tenant.name,
      subtitle: `#${tenantId}`,
      metadata: [{ key: "tenantSlug", value: tenant.slug }],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/platform");
}

export async function impersonateTenantAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const tenant = getTenantById(tenantId);

  if (!tenant) throw new Error("Tenant not found or inactive");
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId: tenant.id,
    userId: session.userId,
    userName: session.name,
    userRole: session.role,
    entityType: "tenant",
    entityId: tenant.id,
    action: "started_impersonation",
    detail: stringifyAuditDetail({
      summary: tenant.name,
      subtitle: `#${tenant.id}`,
      metadata: [{ key: "tenantSlug", value: tenant.slug }],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  await createSession({
    userId: session.userId,
    tenantId: tenant.id,
    role: session.role,
    name: session.name,
    email: session.email,
  });

  redirect("/");
}

export async function stopImpersonationAction(): Promise<void> {
  const session = await requireSuperAdmin();
  const homeTenantId = session.homeTenantId ?? session.tenantId;
  const tenant = getTenantByIdIncludingInactive(homeTenantId);

  if (!tenant || tenant.active !== 1) {
    throw new Error("Home tenant is unavailable");
  }
  const requestContext = await getAuditRequestContext();
  logAction({
    tenantId: homeTenantId,
    userId: session.userId,
    userName: session.name,
    userRole: session.role,
    entityType: "tenant",
    entityId: homeTenantId,
    action: "stopped_impersonation",
    detail: stringifyAuditDetail({
      summary: tenant.name,
      subtitle: `#${homeTenantId}`,
      metadata: [{ key: "tenantSlug", value: tenant.slug }],
    }),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  await createSession({
    userId: session.userId,
    tenantId: homeTenantId,
    role: session.role,
    name: session.name,
    email: session.email,
  });

  redirect("/platform");
}

export async function updateTenantBillingSettingsAction(
  _prevState: TenantBillingState,
  formData: FormData
): Promise<TenantBillingState> {
  const session = await requireSuperAdmin();

  const tenantId = `${formData.get("tenantId") ?? ""}`.trim();
  const baseMonthlyPrice = Number(`${formData.get("baseMonthlyPrice") ?? "0"}`);
  const perVehicleMonthlyPrice = Number(`${formData.get("perVehicleMonthlyPrice") ?? "0"}`);

  try {
    updateTenantBillingSettings(tenantId, {
      baseMonthlyPrice,
      perVehicleMonthlyPrice,
    });
    const requestContext = await getAuditRequestContext();
    logAction({
      tenantId,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      entityType: "billing",
      entityId: tenantId,
      action: "updated_billing_settings",
      detail: stringifyAuditDetail({
        summary: "Tenant billing settings",
        subtitle: `#${tenantId}`,
        metadata: [
          { key: "baseMonthlyPrice", value: String(baseMonthlyPrice) },
          { key: "perVehicleMonthlyPrice", value: String(perVehicleMonthlyPrice) },
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath(`/platform/tenants/${tenantId}/billing`);
    revalidatePath("/platform");

    return {
      success: "Billing settings saved.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to save billing settings",
    };
  }
}

export async function generateTenantInvoiceAction(
  _prevState: TenantBillingState,
  formData: FormData
): Promise<TenantBillingState> {
  const session = await requireSuperAdmin();

  const tenantId = `${formData.get("tenantId") ?? ""}`.trim();
  const billingMonth = `${formData.get("billingMonth") ?? ""}`.trim();

  try {
    const pricing = getTenantBillingSettings(tenantId);
    const vehicleCount = countBillableVehiclesForMonth(tenantId, billingMonth);

    createTenantInvoice({
      tenantId,
      billingMonth,
      vehicleCount,
      baseMonthlyPrice: pricing.baseMonthlyPrice,
      perVehicleMonthlyPrice: pricing.perVehicleMonthlyPrice,
    });
    const requestContext = await getAuditRequestContext();
    logAction({
      tenantId,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      entityType: "billing",
      entityId: tenantId,
      action: "generated_invoice",
      detail: stringifyAuditDetail({
        summary: "Tenant invoice",
        subtitle: `#${tenantId}`,
        metadata: [
          { key: "billingMonth", value: billingMonth },
          { key: "vehicleCount", value: String(vehicleCount) },
          { key: "invoiceTotal", value: String(pricing.baseMonthlyPrice + vehicleCount * pricing.perVehicleMonthlyPrice) },
        ],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath(`/platform/tenants/${tenantId}/billing`);
    revalidatePath("/platform");

    return {
      success: `Invoice ${billingMonth} created successfully.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create invoice",
    };
  }
}
