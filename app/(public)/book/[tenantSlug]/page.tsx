import { PublicBookingPage } from "@/components/public/booking-page";
import { getTenantBySlug, getTenantFeatureOverrides, getTenantSettings } from "@/lib/auth-db";
import { canUsePlanFeature } from "@/lib/plan-features";
import { notFound } from "next/navigation";

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) notFound();
  const [overrides, settings] = await Promise.all([
    getTenantFeatureOverrides(tenant.id),
    getTenantSettings(tenant.id),
  ]);
  if (!canUsePlanFeature(tenant.plan, "publicBooking", overrides)) notFound();

  return (
    <PublicBookingPage
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      locations={settings.locations}
      availableExtras={settings.extras}
      currency={settings.currency}
    />
  );
}
