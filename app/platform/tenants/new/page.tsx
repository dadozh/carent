import { CreateTenantForm } from "@/components/platform/create-tenant-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create tenant</h2>
        <p className="text-muted-foreground">
          Provision a tenant and its initial tenant-admin account in one step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
