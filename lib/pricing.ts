export interface PricingTier {
  maxDays: number | null; // null = "and above" (must be the last tier)
  dailyRate: number;
}

export interface PricingTemplate {
  id: string;
  name: string;
  tiers: PricingTier[];
}

/** Find the applicable tier for a rental of `days` days. */
export function resolveTier(tiers: PricingTier[], days: number): PricingTier | null {
  if (!tiers.length) return null;
  // Sort: finite maxDays ascending, null (open-ended) last
  const sorted = [...tiers].sort((a, b) => {
    if (a.maxDays === null) return 1;
    if (b.maxDays === null) return -1;
    return a.maxDays - b.maxDays;
  });
  return sorted.find((t) => t.maxDays === null || days <= t.maxDays) ?? sorted[sorted.length - 1];
}

/** Calculate total rental cost using tiers; falls back to flatRate if tiers are empty. */
export function calculateCost(days: number, tiers: PricingTier[], flatRate: number): number {
  const tier = resolveTier(tiers, days);
  const rate = tier?.dailyRate ?? flatRate;
  return Math.round(days * rate * 100) / 100;
}

/** The effective daily rate for a given duration (for display). */
export function effectiveDailyRate(days: number, tiers: PricingTier[], flatRate: number): number {
  const tier = resolveTier(tiers, days);
  return tier?.dailyRate ?? flatRate;
}
