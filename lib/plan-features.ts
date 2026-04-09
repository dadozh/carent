/**
 * Plan-based feature flags.
 *
 * Plans (in order of capability):
 *   starter    — core ops only
 *   pro        — + return photos + analytics
 *   enterprise — + audit log + public booking
 *   trial      — same as enterprise (full access while evaluating)
 *
 * Per-tenant overrides (set by super admin) take precedence over plan defaults.
 */

export type PlanFeature = "returnPhotos" | "analytics" | "auditLog" | "publicBooking";

export type FeatureOverrides = Partial<Record<PlanFeature, boolean>>;

const PLAN_FEATURES: Record<string, ReadonlySet<PlanFeature>> = {
  starter:    new Set([]),
  pro:        new Set<PlanFeature>(["returnPhotos", "analytics"]),
  enterprise: new Set<PlanFeature>(["returnPhotos", "analytics", "auditLog", "publicBooking"]),
  trial:      new Set<PlanFeature>(["returnPhotos", "analytics", "auditLog", "publicBooking"]),
};

/** Human-readable metadata for each feature — used in the super-admin UI. */
export const PLAN_FEATURE_LIST: { feature: PlanFeature; label: string; description: string }[] = [
  { feature: "returnPhotos",  label: "Return Photos",   description: "Upload photos during vehicle return checklist" },
  { feature: "analytics",     label: "Analytics",       description: "Revenue stats per vehicle and customer lifetime value" },
  { feature: "auditLog",      label: "Audit Log",       description: "Immutable mutation log for compliance and dispute resolution" },
  { feature: "publicBooking", label: "Public Booking",  description: "Customer-facing booking page at /book/{slug}" },
];

/** Returns the display label for a plan slug. */
export const PLAN_LABELS: Record<string, string> = {
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
  trial:      "Trial",
};

export const PLAN_SLUGS = ["starter", "pro", "enterprise", "trial"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

/**
 * Returns true if the plan (plus any per-tenant overrides) grants the feature.
 * Overrides take full precedence: true forces on, false forces off.
 */
export function canUsePlanFeature(
  plan: string,
  feature: PlanFeature,
  overrides?: FeatureOverrides,
): boolean {
  if (overrides && feature in overrides) return overrides[feature]!;
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

/**
 * Throws a 403-flavored error if the plan (plus overrides) does not grant the feature.
 * Use this in API routes to guard plan-gated endpoints.
 */
export function assertPlanFeature(
  plan: string,
  feature: PlanFeature,
  overrides?: FeatureOverrides,
): void {
  if (!canUsePlanFeature(plan, feature, overrides)) {
    throw new Error(`Forbidden: plan '${plan}' does not include feature '${feature}'`);
  }
}
