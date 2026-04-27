import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { AuditLogView } from "@/components/audit/audit-log-view";
import { getTenantByIdIncludingInactive } from "@/lib/auth-db";
import { LOCALE_COOKIE_KEY, type Locale } from "@/lib/i18n-config";
import { verifySession } from "@/lib/session";

export default async function TenantAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams?: Promise<{ stream?: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/");

  const { tenantId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const stream = resolvedSearchParams?.stream === "admin" ? "admin" : "operations";
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get(LOCALE_COOKIE_KEY)?.value === "sr" ? "sr" : "en";
  const tenant = await getTenantByIdIncludingInactive(tenantId);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tenant.name} audit log</h2>
          <p className="text-muted-foreground">
            Tenant-specific mutation history, including request IP address and browser information.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/platform/tenants/${tenant.id}/billing`} className={buttonVariants({ variant: "outline" })}>
            Billing
          </Link>
          <Link href="/platform" className={buttonVariants({ variant: "outline" })}>
            Back to platform
          </Link>
        </div>
      </div>

      <AuditLogView
        endpoint={`/api/platform/audit-logs?tenantId=${encodeURIComponent(tenant.id)}`}
        title={stream === "admin"
          ? (locale === "sr" ? "Administrativni dnevnik" : "Administrative Audit")
          : (locale === "sr" ? "Operativni dnevnik" : "Operations Audit")}
        description={stream === "admin"
          ? (locale === "sr"
              ? `Prikazuje administrativne i kontrolne izmene za /${tenant.slug}.`
              : `Showing administrative and control-plane changes for /${tenant.slug}.`)
          : (locale === "sr"
              ? `Prikazuje operativne izmene za /${tenant.slug}.`
              : `Showing operational changes for /${tenant.slug}.`)}
        category={stream}
        tabs={[
          {
            href: `/platform/tenants/${tenant.id}/audit?stream=operations`,
            label: locale === "sr" ? "Operacije" : "Operations",
            active: stream === "operations",
          },
          {
            href: `/platform/tenants/${tenant.id}/audit?stream=admin`,
            label: locale === "sr" ? "Administracija" : "Administration",
            active: stream === "admin",
          },
        ]}
      />
    </div>
  );
}
