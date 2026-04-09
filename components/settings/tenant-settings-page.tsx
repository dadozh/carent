"use client";

import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library } from "lucide-react";
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
          <CardTitle>{t("settings.tenant.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantSettingsForm initialLocations={initialLocations} initialExtras={initialExtras} />
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
