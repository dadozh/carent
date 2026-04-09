/**
 * Plan-based feature flags.
 *
 * Plans (in order of capability):
 *   starter    — core ops only
 *   pro        — + return photos + analytics
 *   enterprise — + audit log + public booking
 *   trial      — same as enterprise (full access while evaluating)
 */

export type PlanFeature = "returnPhotos" | "analytics" | "auditLog" | "publicBooking";

const PLAN_FEATURES: Record<string, ReadonlySet<PlanFeature>> = {
  starter:    new Set([]),
  pro:        new Set<PlanFeature>(["returnPhotos", "analytics"]),
  enterprise: new Set<PlanFeature>(["returnPhotos", "analytics", "auditLog", "publicBooking"]),
  trial:      new Set<PlanFeature>(["returnPhotos", "analytics", "auditLog", "publicBooking"]),
};

/** Returns the display label for a plan slug. */
export const PLAN_LABELS: Record<string, string> = {
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
  trial:      "Trial",
};

export const PLAN_SLUGS = ["starter", "pro", "enterprise", "trial"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

/** Returns true if the given plan includes the feature. */
export function canUsePlanFeature(plan: string, feature: PlanFeature): boolean {
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

/**
 * Throws a 403-flavored error if the plan does not include the feature.
 * Use this in API routes to guard plan-gated endpoints.
 */
export function assertPlanFeature(plan: string, feature: PlanFeature): void {
  if (!canUsePlanFeature(plan, feature)) {
    throw new Error(`Forbidden: plan '${plan}' does not include feature '${feature}'`);
  }
}
