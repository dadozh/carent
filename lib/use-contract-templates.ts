"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ContractTemplateDocument,
  ContractTemplatePlaceholder,
} from "@/lib/contract-template-content";
import type { ContractTemplateRecord } from "@/lib/contract-template-db";
import type { Locale } from "@/lib/i18n-config";

interface ContractTemplatesResponse {
  templates: ContractTemplateRecord[];
  enabledLanguages: Locale[];
  defaultLanguage: Locale;
  placeholders: ContractTemplatePlaceholder[];
}

export function useContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplateRecord[]>([]);
  const [enabledLanguages, setEnabledLanguages] = useState<Locale[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>("en");
  const [placeholders, setPlaceholders] = useState<ContractTemplatePlaceholder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/contract-templates", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load contract templates: ${response.status}`);
    }

    const data = await response.json() as ContractTemplatesResponse;
    setTemplates(data.templates ?? []);
    setEnabledLanguages(data.enabledLanguages ?? []);
    setDefaultLanguage(data.defaultLanguage ?? "en");
    setPlaceholders(data.placeholders ?? []);
  }, []);

  useEffect(() => {
    let active = true;

    load()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [load]);

  const updateTemplateDraft = useCallback(async (language: Locale, payload: { name: string; draft: ContractTemplateDocument }) => {
    const response = await fetch(`/api/contract-templates/${language}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { template?: ContractTemplateRecord; error?: string };
    if (!response.ok || !data.template) throw new Error(data.error ?? "Failed to save contract template");
    setTemplates((current) => current.map((template) => template.language === language ? data.template! : template));
    return data.template;
  }, []);

  const publishTemplate = useCallback(async (language: Locale) => {
    const response = await fetch(`/api/contract-templates/${language}/publish`, { method: "POST" });
    const data = await response.json() as { template?: ContractTemplateRecord; error?: string };
    if (!response.ok || !data.template) throw new Error(data.error ?? "Failed to publish contract template");
    setTemplates((current) => current.map((template) => template.language === language ? data.template! : template));
    return data.template;
  }, []);

  const updateLanguageSettings = useCallback(async (contractLanguages: Locale[], defaultContractLanguage: Locale) => {
    const response = await fetch("/api/contract-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractLanguages, defaultContractLanguage }),
    });
    const data = await response.json() as { enabledLanguages?: Locale[]; defaultLanguage?: Locale; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Failed to update language settings");
    setEnabledLanguages(data.enabledLanguages ?? contractLanguages);
    setDefaultLanguage(data.defaultLanguage ?? defaultContractLanguage);
  }, []);

  return {
    templates,
    enabledLanguages,
    defaultLanguage,
    placeholders,
    loading,
    reload: load,
    updateTemplateDraft,
    publishTemplate,
    updateLanguageSettings,
  };
}
