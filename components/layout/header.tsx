"use client";

import { Bell, Globe, LogOut, User, Users, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  isImpersonating?: boolean;
}

export function Header({ userName, userEmail, userRole, isImpersonating = false }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div />

      <div className="flex items-center gap-4">
        {userRole === "super_admin" && (
          <Link
            href="/platform"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            title="Platform"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isImpersonating ? "Platform" : "Tenants"}</span>
          </Link>
        )}

        {(userRole === "tenant_admin" || userRole === "super_admin") && (
          <Link
            href="/settings/users"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            title="User management"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Users</span>
          </Link>
        )}

        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          title={userEmail}
        >
          <User className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Profile</span>
        </Link>

        <button
          onClick={() => setLocale(locale === "en" ? "sr" : "en")}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          title={t("common.language")}
        >
          <Globe className="h-3.5 w-3.5" />
          {locale === "en" ? "EN" : "SR"}
        </button>

        <button className="relative rounded-md p-2 hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-md p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
