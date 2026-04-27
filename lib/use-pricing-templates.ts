"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricingTemplate, PricingTier } from "@/lib/pricing";

export function usePricingTemplates() {
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pricing-templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createTemplate = useCallback(async (name: string, tiers: PricingTier[]): Promise<PricingTemplate> => {
    const res = await fetch("/api/pricing-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tiers }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    const { id } = await res.json();
    const tmpl = { id, name, tiers };
    setTemplates((prev) => [...prev, tmpl]);
    return tmpl;
  }, []);

  const updateTemplate = useCallback(async (id: string, name: string, tiers: PricingTier[]): Promise<void> => {
    const res = await fetch(`/api/pricing-templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tiers }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    setTemplates((prev) => prev.map((t) => t.id === id ? { id, name, tiers } : t));
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/pricing-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate };
}
