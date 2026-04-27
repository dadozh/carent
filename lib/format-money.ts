import type { PricingTier } from "@/lib/pricing";

export function vehiclePriceDisplay(
  vehicle: { dailyRate: number; pricingTiers?: PricingTier[] | null },
  currency: string,
): string {
  const tiers = vehicle.pricingTiers ?? [];
  if (!tiers.length) return formatMoneyCompact(vehicle.dailyRate, currency);
  const rates = tiers.map((t) => t.dailyRate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return formatMoneyCompact(min, currency);
  return `${formatMoneyCompact(min, currency)}–${formatMoneyCompact(max, currency)}`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyCompact(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
