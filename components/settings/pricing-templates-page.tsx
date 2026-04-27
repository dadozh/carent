"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TierEditor } from "@/components/settings/tier-editor";
import { usePricingTemplates } from "@/lib/use-pricing-templates";
import type { PricingTier } from "@/lib/pricing";
import { useCurrency } from "@/lib/tenant-context";
import { formatMoneyCompact } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface TemplateFormState {
  name: string;
  tiers: PricingTier[];
}

const EMPTY_FORM: TemplateFormState = { name: "", tiers: [] };

export function PricingTemplatesPage() {
  const { t } = useI18n();
  const currency = useCurrency();
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = usePricingTemplates();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null); // template id or "new"
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function startNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(id: string) {
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    setEditing(id);
    setForm({ name: tmpl.name, tiers: tmpl.tiers });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError(t("settings.pricing.errorNameRequired")); return; }
    setSaving(true);
    setError(null);
    try {
      if (editing === "new") {
        await createTemplate(form.name.trim(), form.tiers);
      } else if (editing) {
        await updateTemplate(editing, form.name.trim(), form.tiers);
      }
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.pricing.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("settings.pricing.confirmDelete"))) return;
    try { await deleteTemplate(id); } catch (e) { alert(e instanceof Error ? e.message : t("settings.pricing.errorDelete")); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.pricing.title")}</h1>
        <p className="text-muted-foreground">{t("settings.pricing.description")}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("settings.pricing.templates")}</CardTitle>
          {editing !== "new" && (
            <Button size="sm" onClick={startNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("settings.pricing.newTemplate")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

          {/* New template inline form */}
          {editing === "new" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
              <p className="text-sm font-medium">{t("settings.pricing.newTemplate")}</p>
              <TemplateForm form={form} onChange={setForm} saving={saving} error={error} onSave={handleSave} onCancel={cancelEdit} />
            </div>
          )}

          {!loading && templates.length === 0 && editing !== "new" && (
            <p className="text-sm text-muted-foreground">{t("settings.pricing.noTemplates")}</p>
          )}

          {templates.map((tmpl) => (
            <div key={tmpl.id} className="rounded-lg border border-border">
              {editing === tmpl.id ? (
                <div className="p-4 space-y-4">
                  <p className="text-sm font-medium">{t("settings.pricing.editTemplate")}</p>
                  <TemplateForm form={form} onChange={setForm} saving={saving} error={error} onSave={handleSave} onCancel={cancelEdit} />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(tmpl.id)}
                      className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                    >
                      {expanded.has(tmpl.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      {tmpl.name}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({tmpl.tiers.length} {tmpl.tiers.length === 1 ? t("settings.pricing.tier") : t("settings.pricing.tiers")})
                      </span>
                    </button>
                    <button type="button" onClick={() => startEdit(tmpl.id)} className="text-muted-foreground hover:text-foreground p-1" aria-label={t("common.edit")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(tmpl.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label={t("settings.pricing.delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {expanded.has(tmpl.id) && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-1">
                      {tmpl.tiers.length === 0 && <p className="text-xs text-muted-foreground">{t("settings.pricing.noTiersDefined")}</p>}
                      {[...tmpl.tiers].sort((a, b) => (a.maxDays ?? Infinity) - (b.maxDays ?? Infinity)).map((tier, i) => (
                        <p key={i} className="text-sm">
                          <span className="text-muted-foreground">
                            {tier.maxDays === null
                              ? t("settings.pricing.aboveAll")
                              : t("settings.pricing.upToDays").replace("{days}", String(tier.maxDays))}
                          </span>
                          {" → "}
                          <span className="font-medium">{formatMoneyCompact(tier.dailyRate, currency)}{t("settings.pricing.perDaySuffix")}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateForm({ form, onChange, saving, error, onSave, onCancel }: {
  form: TemplateFormState;
  onChange: (f: TemplateFormState) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("settings.pricing.name")}</label>
        <Input
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder={t("settings.pricing.namePlaceholder")}
          disabled={saving}
          className={cn(!form.name && "border-destructive/50")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("settings.pricing.tiers")}</label>
        <TierEditor tiers={form.tiers} onChange={(tiers) => onChange({ ...form, tiers })} disabled={saving} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}
