import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { verifySession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { stopImpersonationAction } from "./actions";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Platform</h1>
              {session.isImpersonating ? <Badge variant="secondary">Impersonating tenant</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as {session.name} ({session.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {session.isImpersonating ? (
              <form action={stopImpersonationAction}>
                <Button type="submit" variant="secondary">Stop impersonating</Button>
              </form>
            ) : null}
            <form action="/api/auth/logout" method="POST">
              <Button type="submit" variant="outline">Sign out</Button>
            </form>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Open tenant app
            </Link>
            <Link href="/platform/tenants/new" className={buttonVariants({ variant: "outline" })}>
              New tenant
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
