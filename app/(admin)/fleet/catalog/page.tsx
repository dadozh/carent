"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getMakes,
  getCustomCatalog,
  addModelRange,
  removeFromCustomCatalog,
} from "@/lib/vehicle-data";
import { useI18n } from "@/lib/i18n";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => ({
  value: String(CURRENT_YEAR - i),
}));

interface CustomEntry {
  make: string;
  model: string;
  years: number[];
}

function yearsLabel(years: number[]): string {
  if (years.length === 0) return "—";
  const sorted = [...years].sort((a, b) => a - b);
  // Compact: show as range if consecutive
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}–${end}`);
      if (i < sorted.length) { start = sorted[i]; end = sorted[i]; }
    }
  }
  return ranges.join(", ");
}

export default function CatalogPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<CustomEntry[]>([]);
  const [expandedMakes, setExpandedMakes] = useState<Set<string>>(new Set());

  // Add form state
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [fromYear, setFromYear] = useState(String(CURRENT_YEAR));
  const [toYear, setToYear] = useState(String(CURRENT_YEAR));
  const [formError, setFormError] = useState("");
  const [justAdded, setJustAdded] = useState("");

  const reload = useCallback(() => {
    const catalog = getCustomCatalog();
    const flat: CustomEntry[] = [];
    for (const [mk, models] of Object.entries(catalog)) {
      for (const [mdl, years] of Object.entries(models)) {
        flat.push({ make: mk, model: mdl, years });
      }
    }
    flat.sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
    setEntries(flat);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Group entries by make for display
  const byMake = entries.reduce<Record<string, CustomEntry[]>>((acc, e) => {
    (acc[e.make] ??= []).push(e);
    return acc;
  }, {});

  function toggleMake(make: string) {
    setExpandedMakes((prev) => {
      const next = new Set(prev);
      if (next.has(make)) {
        next.delete(make);
      } else {
        next.add(make);
      }
      return next;
    });
  }

  function handleAdd() {
    setFormError("");
    if (!make.trim()) { setFormError(t("catalog.makeRequired")); return; }
    if (!model.trim()) { setFormError(t("catalog.modelRequired")); return; }
    const from = parseInt(fromYear, 10);
    const to = parseInt(toYear, 10);
    if (isNaN(from) || isNaN(to)) { setFormError(t("catalog.invalidYear")); return; }
    if (from > to) { setFormError(t("catalog.fromMustBeBeforeTo")); return; }

    addModelRange(make.trim().toUpperCase(), model.trim(), from, to);
    setJustAdded(`${make.trim().toUpperCase()} ${model.trim()}`);
    setModel("");
    setFromYear(String(CURRENT_YEAR));
    setToYear(String(CURRENT_YEAR));
    reload();
    setExpandedMakes((prev) => new Set([...prev, make.trim().toUpperCase()]));
    setTimeout(() => setJustAdded(""), 3000);
  }

  function handleDelete(entry: CustomEntry) {
    removeFromCustomCatalog(entry.make, entry.model);
    reload();
  }

  const makeOptions = getMakes().map((m) => ({ value: m }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("catalog.title")}</h1>

      {/* Add form */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <Plus className="h-4 w-4 text-primary" />
          {t("catalog.addCustomModel")}
        </h2>
        <p className="text-xs text-muted-foreground -mt-2">
          {t("catalog.addCustomModelDesc")}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("catalog.make")} <span className="text-destructive">*</span>
            </label>
            <SearchableSelect
              options={makeOptions}
              value={make}
              onChange={setMake}
              placeholder={t("catalog.selectOrTypeMake")}
              searchPlaceholder={t("catalog.searchOrAddNew")}
              allowCustom
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("catalog.modelLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("catalog.modelPlaceholder")}
              className="h-10"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("catalog.fromYear")}</label>
            <SearchableSelect
              options={YEAR_OPTIONS}
              value={fromYear}
              onChange={setFromYear}
              placeholder={t("catalog.from")}
              searchPlaceholder={t("catalog.typeYear")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("catalog.toYear")}</label>
            <SearchableSelect
              options={YEAR_OPTIONS}
              value={toYear}
              onChange={setToYear}
              placeholder={t("catalog.to")}
              searchPlaceholder={t("catalog.typeYear")}
            />
          </div>
        </div>

        {formError && (
          <p className="text-xs text-destructive">{formError}</p>
        )}
        {justAdded && (
          <p className="text-xs text-green-600">
            ✓ &ldquo;{justAdded}&rdquo; {t("catalog.addedSuccessfully")}
          </p>
        )}

        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("catalog.addToCatalog")}
        </Button>
      </section>

      {/* Custom entries list */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">
          {t("catalog.customEntries")} {entries.length > 0 && `(${entries.length})`}
        </h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("catalog.noCustomEntries")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("catalog.noCustomEntriesDesc")}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {Object.entries(byMake).map(([mk, models], makeIdx) => {
              const isExpanded = expandedMakes.has(mk);
              return (
                <div
                  key={mk}
                  className={cn(
                    "border-border",
                    makeIdx > 0 && "border-t"
                  )}
                >
                  {/* Make header row */}
                  <button
                    type="button"
                    onClick={() => toggleMake(mk)}
                    className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{mk}</span>
                      <Badge variant="secondary" className="text-xs">
                        {models.length} {models.length === 1 ? t("catalog.model") : t("catalog.models")}
                      </Badge>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </button>

                  {/* Models */}
                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {models.map((entry) => (
                        <div
                          key={entry.model}
                          className="flex items-center justify-between px-4 py-3 bg-card"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{entry.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {yearsLabel(entry.years)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            aria-label={`${t("catalog.remove")} ${entry.make} ${entry.model}`}
                            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
