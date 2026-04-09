"use client";

import { createContext, useContext } from "react";
import { canUsePlanFeature, type PlanFeature, type FeatureOverrides } from "@/lib/plan-features";

interface PlanContextValue {
  plan: string;
  featureOverrides: FeatureOverrides;
}

const PlanContext = createContext<PlanContextValue>({ plan: "starter", featureOverrides: {} });

export function PlanProvider({
  plan,
  featureOverrides,
  children,
}: {
  plan: string;
  featureOverrides: FeatureOverrides;
  children: React.ReactNode;
}) {
  return <PlanContext.Provider value={{ plan, featureOverrides }}>{children}</PlanContext.Provider>;
}

/** Returns the current tenant's plan slug. */
export function usePlan(): string {
  return useContext(PlanContext).plan;
}

/** Returns true if the current tenant's plan (plus any overrides) grants the feature. */
export function usePlanFeature(feature: PlanFeature): boolean {
  const { plan, featureOverrides } = useContext(PlanContext);
  return canUsePlanFeature(plan, feature, featureOverrides);
}
