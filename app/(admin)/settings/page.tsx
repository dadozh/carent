import { getTenantSettingsForPage } from "./actions";
import { TenantSettingsPageClient } from "@/components/settings/tenant-settings-page";

export default async function TenantSettingsPage() {
  const settings = await getTenantSettingsForPage();

  return (
    <TenantSettingsPageClient
      initialLocations={settings.locations}
      initialExtras={settings.extras}
      initialCurrency={settings.currency}
      initialContractLanguages={settings.contractLanguages}
      initialUiLanguages={settings.uiLanguages}
      initialDefaultContractLanguage={settings.defaultContractLanguage}
      initialDefaultUiLanguage={settings.defaultUiLanguage}
    />
  );
}
