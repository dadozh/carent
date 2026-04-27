"use client";

import { useEffect, useState } from "react";
import type { TenantSettings } from "@/lib/auth-db";

const DEFAULT_SETTINGS: TenantSettings = {
  locations: ["Airport", "Downtown"],
  extras: ["GPS", "Wi-Fi", "Child Seat"],
  currency: "EUR",
  contractLanguages: ["en", "sr"],
  uiLanguages: ["en", "sr"],
  defaultContractLanguage: "en",
  defaultUiLanguage: "en",
};

export function useTenantSettings() {
  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/tenant-settings", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load tenant settings: ${response.status}`);
        return response.json() as Promise<{ settings?: TenantSettings }>;
      })
      .then((data) => {
        if (!active) return;
        setSettings(data.settings ?? DEFAULT_SETTINGS);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setSettings(DEFAULT_SETTINGS);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { settings, isLoading };
}
