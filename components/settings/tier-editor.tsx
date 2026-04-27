"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PricingTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface TierRow {
  maxDays: string; // empty string = "and above"
  dailyRate: string;
}

interface TierEditorProps {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
  disabled?: boolean;
}

function toRows(tiers: PricingTier[]): TierRow[] {
  const sorted = [...tiers].sort((a, b) => {
    if (a.maxDays === null) return 1;
    if (b.maxDays === null) return -1;
    return a.maxDays - b.maxDays;
  });
  return sorted.map((t) => ({
    maxDays: t.maxDays === null ? "" : String(t.maxDays),
    dailyRate: t.dailyRate > 0 ? String(t.dailyRate) : "",
  }));
}

function fromRows(rows: TierRow[]): PricingTier[] {
  return rows.map((r) => ({
    maxDays: r.maxDays === "" ? null : parseInt(r.maxDays, 10) || null,
    dailyRate: parseFloat(r.dailyRate) || 0,
  }));
}

export function TierEditor({ tiers, onChange, disabled }: TierEditorProps) {
  const { t } = useI18n();
  const rows = toRows(tiers);
  const lastIdx = rows.length - 1;

  function updateRow(idx: number, field: keyof TierRow, value: string) {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    onChange(fromRows(next));
  }

  function addRow() {
    onChange(fromRows([...rows, { maxDays: "", dailyRate: "" }]));
  }

  function removeRow(idx: number) {
    onChange(fromRows(rows.filter((_, i) => i !== idx)));
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("settings.pricing.noTiers")}</p>
      )}
      {rows.map((row, idx) => {
        const isLast = idx === lastIdx;
        const prevMax = idx > 0 ? (parseInt(rows[idx - 1].maxDays) || 0) : 0;
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground w-16">
              {isLast && row.maxDays === "" ? t("settings.pricing.aboveAll") : t("settings.pricing.upTo")}
            </span>
            {!(isLast && row.maxDays === "") ? (
              <Input
                type="number"
                min={prevMax + 1}
                step={1}
                placeholder={t("settings.pricing.days")}
                value={row.maxDays}
                disabled={disabled}
                onChange={(e) => updateRow(idx, "maxDays", e.target.value)}
                className={cn("h-8 w-20 text-sm", !row.maxDays && "border-destructive/50")}
              />
            ) : (
              <span className="w-20 h-8 flex items-center px-3 text-sm text-muted-foreground border border-border rounded-lg bg-muted/30">∞</span>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">{t("settings.pricing.daysRateSeparator")}</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={row.dailyRate}
              disabled={disabled}
              onChange={(e) => updateRow(idx, "dailyRate", e.target.value)}
              className={cn("h-8 w-24 text-sm", !row.dailyRate && "border-destructive/50")}
            />
            <span className="shrink-0 text-xs text-muted-foreground">{t("settings.pricing.perDaySuffix")}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeRow(idx)}
              className="ml-auto text-muted-foreground hover:text-destructive disabled:opacity-40"
              aria-label={t("settings.pricing.removeTier")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={addRow}
        className="gap-1.5 mt-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("settings.pricing.addTier")}
      </Button>

      {rows.length > 0 && rows[lastIdx].maxDays !== "" && (
        <p className="text-xs text-amber-600">
          {t("settings.pricing.openEndedTip")}
        </p>
      )}
    </div>
  );
}
