import { PublicBookingPage } from "@/components/public/booking-page";
import { getTenantBySlug, getTenantSettings } from "@/lib/auth-db";
import { notFound } from "next/navigation";

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) notFound();

  const settings = getTenantSettings(tenant.id);

  return (
    <PublicBookingPage
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      locations={settings.locations}
      availableExtras={settings.extras}
    />
  );
}
