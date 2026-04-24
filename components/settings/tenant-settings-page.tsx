"use client";

import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import { LogoUpload } from "@/components/settings/logo-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export function TenantSettingsPageClient({
  initialLocations,
  initialExtras,
}: {
  initialLocations: string[];
  initialExtras: string[];
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
        </CardHeader>
        <CardContent>
          <LogoUpload />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.tenant.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantSettingsForm initialLocations={initialLocations} initialExtras={initialExtras} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing templates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Define tiered pricing by rental duration and assign templates to vehicles.</p>
          <Link href="/settings/pricing">
            <Button variant="outline" className="gap-2">
              <Tag className="h-4 w-4" />
              Manage pricing
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("nav.vehicleCatalog")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("settings.tenant.vehicleCatalogDescription")}</p>
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
