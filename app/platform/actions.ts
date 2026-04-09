"use server";

import { randomUUID } from "node:crypto";
import {
  createTenantInvoice,
  createTenantWithAdmin,
  getTenantBillingSettings,
  getTenantById,
  getTenantByIdIncludingInactive,
  setTenantActive,
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
  await requireSuperAdmin();

  const tenantName = `${formData.get("tenantName") ?? ""}`.trim();
  const slug = `${formData.get("slug") ?? ""}`.trim().toLowerCase();
  const plan = `${formData.get("plan") ?? "trial"}`.trim().toLowerCase();
  const adminName = `${formData.get("adminName") ?? ""}`.trim();
  const adminEmail = `${formData.get("adminEmail") ?? ""}`.trim().toLowerCase();
  const tempPassword = generateTemporaryPassword();

  try {
    createTenantWithAdmin({
      tenantName,
      slug,
      adminName,
      adminEmail,
      adminPassword: tempPassword,
      plan,
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

export async function changeTenantPlanAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const plan = `${formData.get("plan") ?? ""}`.trim();
  updateTenantPlan(tenantId, plan);
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

  revalidatePath("/platform");
}

export async function impersonateTenantAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const tenantId = `${formData.get("tenantId") ?? ""}`;
  const tenant = getTenantById(tenantId);

  if (!tenant) throw new Error("Tenant not found or inactive");

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
  await requireSuperAdmin();

  const tenantId = `${formData.get("tenantId") ?? ""}`.trim();
  const baseMonthlyPrice = Number(`${formData.get("baseMonthlyPrice") ?? "0"}`);
  const perVehicleMonthlyPrice = Number(`${formData.get("perVehicleMonthlyPrice") ?? "0"}`);

  try {
    updateTenantBillingSettings(tenantId, {
      baseMonthlyPrice,
      perVehicleMonthlyPrice,
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
  await requireSuperAdmin();

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
