"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TierEditor } from "@/components/settings/tier-editor";
import { usePricingTemplates } from "@/lib/use-pricing-templates";
import type { PricingTier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface TemplateFormState {
  name: string;
  tiers: PricingTier[];
}

const EMPTY_FORM: TemplateFormState = { name: "", tiers: [] };

export function PricingTemplatesPage() {
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
    if (!form.name.trim()) { setError("Name is required"); return; }
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
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pricing template? Vehicles using it will fall back to their flat rate.")) return;
    try { await deleteTemplate(id); } catch (e) { alert(e instanceof Error ? e.message : "Failed to delete"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing templates</h1>
        <p className="text-muted-foreground">Define reusable tiered pricing to assign to vehicles.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Templates</CardTitle>
          {editing !== "new" && (
            <Button size="sm" onClick={startNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New template
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {/* New template inline form */}
          {editing === "new" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
              <p className="text-sm font-medium">New template</p>
              <TemplateForm form={form} onChange={setForm} saving={saving} error={error} onSave={handleSave} onCancel={cancelEdit} />
            </div>
          )}

          {!loading && templates.length === 0 && editing !== "new" && (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          )}

          {templates.map((tmpl) => (
            <div key={tmpl.id} className="rounded-lg border border-border">
              {editing === tmpl.id ? (
                <div className="p-4 space-y-4">
                  <p className="text-sm font-medium">Edit template</p>
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
                      <span className="text-xs text-muted-foreground font-normal">({tmpl.tiers.length} tier{tmpl.tiers.length !== 1 ? "s" : ""})</span>
                    </button>
                    <button type="button" onClick={() => startEdit(tmpl.id)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(tmpl.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {expanded.has(tmpl.id) && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-1">
                      {tmpl.tiers.length === 0 && <p className="text-xs text-muted-foreground">No tiers defined.</p>}
                      {[...tmpl.tiers].sort((a, b) => (a.maxDays ?? Infinity) - (b.maxDays ?? Infinity)).map((tier, i) => (
                        <p key={i} className="text-sm">
                          <span className="text-muted-foreground">{tier.maxDays === null ? "Above all" : `Up to ${tier.maxDays} days`}</span>
                          {" → "}
                          <span className="font-medium">€{tier.dailyRate.toFixed(2)}/day</span>
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
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. Standard, Weekend, Long-term"
          disabled={saving}
          className={cn(!form.name && "border-destructive/50")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tiers</label>
        <TierEditor tiers={form.tiers} onChange={(tiers) => onChange({ ...form, tiers })} disabled={saving} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
