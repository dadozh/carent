import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTenantsWithStats } from "@/lib/auth-db";
import { verifySession } from "@/lib/session";
import Link from "next/link";
import { impersonateTenantAction, toggleTenantActiveAction } from "./actions";

function formatCreatedAt(value: string) {
  const [datePart = "", timePart = ""] = value.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hours = "00", minutes = "00"] = timePart.split(":");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default async function PlatformPage() {
  const session = await verifySession();
  const tenants = listTenantsWithStats();
  const activeTenants = tenants.filter((tenant) => tenant.active === 1).length;
  const disabledTenants = tenants.length - activeTenants;
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.user_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant management</h2>
          <p className="text-muted-foreground">
            Create tenants, manage status, and open an impersonated tenant session.
          </p>
        </div>
        <Link href="/platform/tenants/new" className={buttonVariants()}>
          Create tenant
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total tenants</p>
            <p className="text-2xl font-bold">{tenants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active tenants</p>
            <p className="text-2xl font-bold">{activeTenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Disabled tenants</p>
            <p className="text-2xl font-bold">{disabledTenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Users across tenants</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-3 lg:hidden">
            {tenants.map((tenant) => {
              const canDisable = tenant.id !== session?.tenantId;

              return (
                <div key={tenant.id} className="rounded-xl border p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
                      </div>
                      <Badge variant={tenant.active ? "secondary" : "outline"}>
                        {tenant.active ? "Active" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Plan</p>
                        <p className="font-medium capitalize">{tenant.plan}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Users</p>
                        <p className="font-medium">{tenant.user_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Active users</p>
                        <p className="font-medium">{tenant.active_user_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{formatCreatedAt(tenant.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        href={`/platform/tenants/${tenant.id}/billing`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Billing
                      </Link>
                      <form action={impersonateTenantAction}>
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <Button type="submit" disabled={tenant.active !== 1}>Impersonate</Button>
                      </form>
                      <form action={toggleTenantActiveAction}>
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <input type="hidden" name="nextActive" value={tenant.active ? "false" : "true"} />
                        <Button
                          type="submit"
                          variant={tenant.active ? "destructive" : "secondary"}
                          disabled={tenant.active === 1 && !canDisable}
                        >
                          {tenant.active ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => {
                  const canDisable = tenant.id !== session?.tenantId;

                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.active ? "secondary" : "outline"}>
                          {tenant.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{tenant.plan}</TableCell>
                      <TableCell>{tenant.active_user_count} / {tenant.user_count}</TableCell>
                      <TableCell>{formatCreatedAt(tenant.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/platform/tenants/${tenant.id}/billing`}
                            className={buttonVariants({ variant: "outline" })}
                          >
                            Billing
                          </Link>
                          <form action={impersonateTenantAction}>
                            <input type="hidden" name="tenantId" value={tenant.id} />
                            <Button type="submit" disabled={tenant.active !== 1}>Impersonate</Button>
                          </form>
                          <form action={toggleTenantActiveAction}>
                            <input type="hidden" name="tenantId" value={tenant.id} />
                            <input type="hidden" name="nextActive" value={tenant.active ? "false" : "true"} />
                            <Button
                              type="submit"
                              variant={tenant.active ? "destructive" : "secondary"}
                              disabled={tenant.active === 1 && !canDisable}
                            >
                              {tenant.active ? "Disable" : "Enable"}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
