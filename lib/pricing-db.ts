import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingTemplates, pricingTemplateTiers, vehiclePricingTiers } from "@/lib/db/schema";
import type { PricingTier, PricingTemplate } from "@/lib/pricing";

function toNum(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? "0")) || 0;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplatesForTenant(tenantId: string): Promise<PricingTemplate[]> {
  const rows = await db.select().from(pricingTemplates)
    .where(eq(pricingTemplates.tenantId, tenantId))
    .orderBy(pricingTemplates.createdAt);

  return Promise.all(rows.map(async (tmpl) => {
    const tierRows = await db.select().from(pricingTemplateTiers)
      .where(eq(pricingTemplateTiers.templateId, tmpl.id))
      .orderBy(pricingTemplateTiers.position);
    return {
      id: tmpl.id,
      name: tmpl.name,
      tiers: tierRows.map((t) => ({ maxDays: t.maxDays, dailyRate: toNum(t.dailyRate) })),
    };
  }));
}

export async function createTemplate(tenantId: string, name: string, tiers: PricingTier[]): Promise<string> {
  const id = `pt_${randomUUID()}`;
  await db.insert(pricingTemplates).values({ id, tenantId, name });
  if (tiers.length) {
    await db.insert(pricingTemplateTiers).values(
      tiers.map((t, position) => ({ id: `ptt_${randomUUID()}`, templateId: id, maxDays: t.maxDays, dailyRate: String(t.dailyRate), position }))
    );
  }
  return id;
}

export async function updateTemplate(id: string, tenantId: string, name: string, tiers: PricingTier[]): Promise<void> {
  await db.update(pricingTemplates).set({ name }).where(and(eq(pricingTemplates.id, id), eq(pricingTemplates.tenantId, tenantId)));
  await db.delete(pricingTemplateTiers).where(eq(pricingTemplateTiers.templateId, id));
  if (tiers.length) {
    await db.insert(pricingTemplateTiers).values(
      tiers.map((t, position) => ({ id: `ptt_${randomUUID()}`, templateId: id, maxDays: t.maxDays, dailyRate: String(t.dailyRate), position }))
    );
  }
}

export async function deleteTemplate(id: string, tenantId: string): Promise<void> {
  await db.delete(pricingTemplates).where(and(eq(pricingTemplates.id, id), eq(pricingTemplates.tenantId, tenantId)));
}

// ─── Vehicle custom tiers ─────────────────────────────────────────────────────

export async function getVehiclePricingTiers(vehicleId: string): Promise<PricingTier[]> {
  const rows = await db.select().from(vehiclePricingTiers)
    .where(eq(vehiclePricingTiers.vehicleId, vehicleId))
    .orderBy(vehiclePricingTiers.position);
  return rows.map((r) => ({ maxDays: r.maxDays, dailyRate: toNum(r.dailyRate) }));
}

export async function setVehiclePricingTiers(vehicleId: string, tenantId: string, tiers: PricingTier[]): Promise<void> {
  await db.delete(vehiclePricingTiers).where(eq(vehiclePricingTiers.vehicleId, vehicleId));
  if (tiers.length) {
    await db.insert(vehiclePricingTiers).values(
      tiers.map((t, position) => ({ id: `vpt_${randomUUID()}`, vehicleId, tenantId, maxDays: t.maxDays, dailyRate: String(t.dailyRate), position }))
    );
  }
}

// ─── Effective tiers for cost calculation ─────────────────────────────────────

export async function getEffectiveTiers(vehicleId: string, pricingTemplateId: string | null | undefined): Promise<PricingTier[]> {
  if (pricingTemplateId) {
    const rows = await db.select().from(pricingTemplateTiers)
      .where(eq(pricingTemplateTiers.templateId, pricingTemplateId))
      .orderBy(pricingTemplateTiers.position);
    return rows.map((r) => ({ maxDays: r.maxDays, dailyRate: toNum(r.dailyRate) }));
  }
  return getVehiclePricingTiers(vehicleId);
}
