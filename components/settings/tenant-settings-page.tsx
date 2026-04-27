"use client";

import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import { LogoUpload } from "@/components/settings/logo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Tag } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import Link from "next/link";

export function TenantSettingsPageClient({
  initialLocations,
  initialExtras,
  initialCurrency,
  initialContractLanguages,
  initialUiLanguages,
  initialDefaultContractLanguage,
  initialDefaultUiLanguage,
}: {
  initialLocations: string[];
  initialExtras: string[];
  initialCurrency: string;
  initialContractLanguages: Locale[];
  initialUiLanguages: Locale[];
  initialDefaultContractLanguage: Locale;
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
        initialContractLanguages={initialContractLanguages}
        initialUiLanguages={initialUiLanguages}
        initialDefaultContractLanguage={initialDefaultContractLanguage}
        initialDefaultUiLanguage={initialDefaultUiLanguage}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.pricing.title")}</CardTitle>
          <CardDescription>{t("settings.tenant.pricingTemplatesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/settings/pricing">
            <Button variant="outline" className="gap-2">
              <Tag className="h-4 w-4" />
              {t("settings.pricing.manage")}
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("nav.vehicleCatalog")}</CardTitle>
          <CardDescription>{t("settings.tenant.vehicleCatalogDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/fleet/catalog">
            <Button variant="outline" className="gap-2">
              <Library className="h-4 w-4" />
              {t("settings.tenant.manageVehicleCatalog")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
