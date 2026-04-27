import Link from "next/link";
import { Car } from "lucide-react";
import { TenantLocaleScope } from "@/components/layout/tenant-locale-scope";
import { PublicLanguageSwitcher } from "@/components/layout/public-language-switcher";
import { getTenantBySlug, getTenantSettings } from "@/lib/auth-db";

export default async function TenantPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  const settings = tenant ? await getTenantSettings(tenant.id) : null;

  return (
    <div className="min-h-screen flex flex-col">
      {settings ? (
        <TenantLocaleScope uiLocales={settings.uiLanguages} defaultUiLocale={settings.defaultUiLanguage} />
      ) : null}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href={`/book/${tenantSlug}`} className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">{tenant?.name ?? "CARENT"}</span>
          </Link>
          <div className="flex items-center gap-4">
            <PublicLanguageSwitcher />
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          &copy; 2026 CARENT. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
