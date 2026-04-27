import { describe, it, expect } from "vitest";
import { resolveTier, calculateCost, effectiveDailyRate, type PricingTier } from "@/lib/pricing";

// Tiers used across multiple tests: ≤3 days €80, ≤7 days €65, above €50
const STANDARD_TIERS: PricingTier[] = [
  { maxDays: 3, dailyRate: 80 },
  { maxDays: 7, dailyRate: 65 },
  { maxDays: null, dailyRate: 50 },
];

// Single open-ended tier
const SINGLE_TIER: PricingTier[] = [{ maxDays: null, dailyRate: 60 }];

// Tiers deliberately supplied in wrong order to verify sorting
const UNSORTED_TIERS: PricingTier[] = [
  { maxDays: null, dailyRate: 50 },
  { maxDays: 7, dailyRate: 65 },
  { maxDays: 3, dailyRate: 80 },
];

describe("resolveTier", () => {
  it("returns null when tiers list is empty", () => {
    expect(resolveTier([], 5)).toBeNull();
  });

  it("returns the matching tier at exactly the boundary (≤3 → €80)", () => {
    expect(resolveTier(STANDARD_TIERS, 3)).toEqual({ maxDays: 3, dailyRate: 80 });
  });

  it("returns the next tier one day past the first boundary (4 days → €65)", () => {
    expect(resolveTier(STANDARD_TIERS, 4)).toEqual({ maxDays: 7, dailyRate: 65 });
  });

  it("returns the open-ended tier when above all finite boundaries", () => {
    expect(resolveTier(STANDARD_TIERS, 30)).toEqual({ maxDays: null, dailyRate: 50 });
  });

  it("returns the single tier regardless of day count", () => {
    expect(resolveTier(SINGLE_TIER, 1)).toEqual({ maxDays: null, dailyRate: 60 });
    expect(resolveTier(SINGLE_TIER, 999)).toEqual({ maxDays: null, dailyRate: 60 });
  });

  it("sorts tiers internally — correct result even when input is unsorted", () => {
    expect(resolveTier(UNSORTED_TIERS, 2)).toEqual({ maxDays: 3, dailyRate: 80 });
    expect(resolveTier(UNSORTED_TIERS, 5)).toEqual({ maxDays: 7, dailyRate: 65 });
    expect(resolveTier(UNSORTED_TIERS, 20)).toEqual({ maxDays: null, dailyRate: 50 });
  });

  it("handles a single finite tier — falls through to it as the last resort", () => {
    const tiers: PricingTier[] = [{ maxDays: 3, dailyRate: 80 }];
    // 10 days is beyond maxDays but there is no open-ended tier; last entry is the fallback
    expect(resolveTier(tiers, 10)).toEqual({ maxDays: 3, dailyRate: 80 });
  });
});

describe("calculateCost", () => {
  it("uses flat rate when tiers are empty", () => {
    expect(calculateCost(5, [], 35)).toBe(175);
  });

  it("applies €80/day tier for 1 day", () => {
    expect(calculateCost(1, STANDARD_TIERS, 35)).toBe(80);
  });

  it("applies €65/day tier for 5 days (5 × 65 = 325)", () => {
    expect(calculateCost(5, STANDARD_TIERS, 35)).toBe(325);
  });

  it("applies €50/day open-ended tier for 30 days (30 × 50 = 1500)", () => {
    expect(calculateCost(30, STANDARD_TIERS, 35)).toBe(1500);
  });

  it("rounds fractional totals to 2 decimal places", () => {
    const tiers: PricingTier[] = [{ maxDays: null, dailyRate: 33.33 }];
    // 3 × 33.33 = 99.99
    expect(calculateCost(3, tiers, 0)).toBe(99.99);
  });

  it("uses flat rate as fallback when no tier matches (empty tiers)", () => {
    expect(calculateCost(7, [], 40)).toBe(280);
  });
});

describe("effectiveDailyRate", () => {
  it("returns flat rate when tiers are empty", () => {
    expect(effectiveDailyRate(5, [], 40)).toBe(40);
  });

  it("returns €80 for 2 days", () => {
    expect(effectiveDailyRate(2, STANDARD_TIERS, 40)).toBe(80);
  });

  it("returns €65 for 7 days (at boundary)", () => {
    expect(effectiveDailyRate(7, STANDARD_TIERS, 40)).toBe(65);
  });

  it("returns €50 for 8+ days (above all boundaries)", () => {
    expect(effectiveDailyRate(8, STANDARD_TIERS, 40)).toBe(50);
    expect(effectiveDailyRate(100, STANDARD_TIERS, 40)).toBe(50);
  });
});

// ─── Integration-style tests (no DB required) ────────────────────────────────
// These verify realistic pricing scenarios end-to-end through calculateCost.

describe("pricing scenarios", () => {
  it("flat rate only — weekend rental (2 days)", () => {
    expect(calculateCost(2, [], 50)).toBe(100);
  });

  it("template: short rental stays in first tier", () => {
    expect(calculateCost(3, STANDARD_TIERS, 99)).toBe(240); // 3 × 80
  });

  it("template: mid rental uses second tier", () => {
    expect(calculateCost(6, STANDARD_TIERS, 99)).toBe(390); // 6 × 65
  });

  it("template: long rental uses open-ended tier", () => {
    expect(calculateCost(14, STANDARD_TIERS, 99)).toBe(700); // 14 × 50
  });

  it("custom single-tier vehicle — rate always the same", () => {
    const tiers: PricingTier[] = [{ maxDays: null, dailyRate: 45 }];
    expect(calculateCost(1, tiers, 99)).toBe(45);
    expect(calculateCost(30, tiers, 99)).toBe(1350);
  });

  it("BAM currency scenario — correct arithmetic regardless of symbol", () => {
    // Currency formatting is a UI concern; calculateCost just returns a number
    const tiers: PricingTier[] = [
      { maxDays: 3, dailyRate: 60 },
      { maxDays: null, dailyRate: 45 },
    ];
    expect(calculateCost(3, tiers, 0)).toBe(180); // 3 × 60 BAM
    expect(calculateCost(5, tiers, 0)).toBe(225); // 5 × 45 BAM
  });

  it("RSD currency scenario — large nominal amounts round cleanly", () => {
    const tiers: PricingTier[] = [
      { maxDays: 7, dailyRate: 5000 },
      { maxDays: null, dailyRate: 4200 },
    ];
    expect(calculateCost(7, tiers, 0)).toBe(35000);  // 7 × 5000 RSD
    expect(calculateCost(10, tiers, 0)).toBe(42000); // 10 × 4200 RSD
  });
});
