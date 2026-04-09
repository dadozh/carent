"use client";

import { createContext, useContext } from "react";
import { canUsePlanFeature, type PlanFeature } from "@/lib/plan-features";

const PlanContext = createContext<string>("starter");

export function PlanProvider({
  plan,
  children,
}: {
  plan: string;
  children: React.ReactNode;
}) {
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

/** Returns the current tenant's plan slug. */
export function usePlan(): string {
  return useContext(PlanContext);
}

/** Returns true if the current tenant's plan includes the given feature. */
export function usePlanFeature(feature: PlanFeature): boolean {
  return canUsePlanFeature(useContext(PlanContext), feature);
}
