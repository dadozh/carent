"use client";

import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import { LogoUpload } from "@/components/settings/logo-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n, type Locale } from "@/lib/i18n";
import type { LocationEntry } from "@/lib/location";

export function TenantSettingsPageClient({
  initialLocations,
  initialExtras,
  initialCurrency,
  initialUiLanguages,
  initialDefaultUiLanguage,
}: {
  initialLocations: LocationEntry[];
  initialExtras: string[];
  initialCurrency: string;
  initialUiLanguages: Locale[];
  initialDefaultUiLanguage: Locale;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.tenant.title")}</h1>
        <p className="text-muted-foreground">{t("settings.tenant.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>{t("settings.tenant.brandingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload />
        </CardContent>
      </Card>

      <TenantSettingsForm
        initialLocations={initialLocations}
        initialExtras={initialExtras}
        initialCurrency={initialCurrency}
        initialUiLanguages={initialUiLanguages}
        initialDefaultUiLanguage={initialDefaultUiLanguage}
      />

    </div>
  );
}
