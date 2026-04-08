"use client";

import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

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
    </div>
  );
}
