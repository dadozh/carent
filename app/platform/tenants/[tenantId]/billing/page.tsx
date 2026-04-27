import Link from "next/link";
import { GenerateTenantInvoiceForm, TenantBillingSettingsForm } from "@/components/platform/tenant-billing-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getTenantBillingSettings,
  getTenantByIdIncludingInactive,
  getTenantFeatureOverrides,
  listTenantInvoices,
} from "@/lib/auth-db";
import { formatDate } from "@/lib/date-format";
import { formatMoney as _formatMoney } from "@/lib/format-money";
import { countBillableVehiclesForMonth } from "@/lib/vehicle-db";
import { PLAN_FEATURE_LIST, canUsePlanFeature, type FeatureOverrides } from "@/lib/plan-features";
import { setTenantFeatureOverrideAction } from "@/app/platform/actions";
import { notFound } from "next/navigation";

function formatMoney(value: number) { return _formatMoney(value, "EUR"); }

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}.${year}`;
}

function formatDateTime(value: string) {
  const [datePart = "", timePart = ""] = value.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hours = "00", minutes = "00"] = timePart.split(":");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getCurrentBillingMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function TenantBillingPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantByIdIncludingInactive(tenantId);

  if (!tenant) notFound();

  const currentBillingMonth = getCurrentBillingMonth();
  const [billingSettings, invoices, featureOverrides, projectedVehicleCount] = await Promise.all([
    getTenantBillingSettings(tenantId),
    listTenantInvoices(tenantId),
    getTenantFeatureOverrides(tenantId),
    countBillableVehiclesForMonth(tenantId, currentBillingMonth),
  ]);
  const projectedMonthlyTotal =
    billingSettings.baseMonthlyPrice + (projectedVehicleCount * billingSettings.perVehicleMonthlyPrice);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tenant.name} billing</h2>
          <p className="text-muted-foreground">
            Manage monthly pricing and generate invoice snapshots for /{tenant.slug}.
          </p>
        </div>
        <Link href="/platform" className={buttonVariants({ variant: "outline" })}>
          Back to platform
        </Link>
        <Link href={`/platform/tenants/${tenantId}/audit`} className={buttonVariants({ variant: "outline" })}>
          Audit log
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Fixed monthly price</p>
            <p className="text-2xl font-bold">{formatMoney(billingSettings.baseMonthlyPrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Per-car monthly price</p>
            <p className="text-2xl font-bold">{formatMoney(billingSettings.perVehicleMonthlyPrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Cars in {formatMonth(currentBillingMonth)}</p>
            <p className="text-2xl font-bold">{projectedVehicleCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Projected total</p>
            <p className="text-2xl font-bold">{formatMoney(projectedMonthlyTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Set the tenant’s fixed monthly fee and the additional monthly fee per car.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <TenantBillingSettingsForm
              tenantId={tenantId}
              initialBaseMonthlyPrice={billingSettings.baseMonthlyPrice}
              initialPerVehicleMonthlyPrice={billingSettings.perVehicleMonthlyPrice}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create monthly invoice</CardTitle>
            <CardDescription>
              Generate one invoice per tenant per month using the current pricing snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <GenerateTenantInvoiceForm tenantId={tenantId} defaultBillingMonth={currentBillingMonth} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature overrides</CardTitle>
          <CardDescription>
            Override individual features on or off regardless of plan. Use this for custom deals or testing.
            &quot;Plan default&quot; removes the override and falls back to what the plan normally grants.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {PLAN_FEATURE_LIST.map(({ feature, label, description }) => {
              const override = featureOverrides[feature];
              const planDefault = canUsePlanFeature(tenant.plan, feature);
              const effective = override !== undefined ? override : planDefault;
              const currentValue = override === true ? "on" : override === false ? "off" : "plan";
              return (
                <div key={feature} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${effective ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                        {effective ? "Enabled" : "Disabled"}
                      </span>
                      {override !== undefined && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Override active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <form action={setTenantFeatureOverrideAction} className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="feature" value={feature} />
                    <select
                      name="value"
                      defaultValue={currentValue}
                      className="rounded-md border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="plan">Plan default ({planDefault ? "on" : "off"})</option>
                      <option value="on">Force on</option>
                      <option value="off">Force off</option>
                    </select>
                    <Button type="submit" variant="outline" size="sm">Apply</Button>
                  </form>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Historical invoice snapshots remain unchanged even if pricing or fleet size changes later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {invoices.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No invoices created yet.
            </p>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-xl border p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{formatMonth(invoice.billing_month)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}
                          </p>
                        </div>
                        <p className="text-base font-semibold">{formatMoney(invoice.total_amount)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Fixed fee</p>
                          <p className="font-medium">{formatMoney(invoice.base_monthly_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Per car</p>
                          <p className="font-medium">{formatMoney(invoice.per_vehicle_monthly_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cars billed</p>
                          <p className="font-medium">{invoice.vehicle_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{formatDateTime(invoice.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Cars billed</TableHead>
                      <TableHead>Fixed fee</TableHead>
                      <TableHead>Per car</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{formatMonth(invoice.billing_month)}</TableCell>
                        <TableCell>{invoice.vehicle_count}</TableCell>
                        <TableCell>{formatMoney(invoice.base_monthly_price)}</TableCell>
                        <TableCell>{formatMoney(invoice.per_vehicle_monthly_price)}</TableCell>
                        <TableCell>{formatMoney(invoice.total_amount)}</TableCell>
                        <TableCell>{formatDateTime(invoice.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
