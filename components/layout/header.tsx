"use client";

import { Bell, Search, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";

export function Header() {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="relative hidden sm:block w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search") + "..."} className="pl-9" />
      </div>

      <div className="flex items-center gap-4">
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
              AD
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">Admin</p>
            <p className="text-xs text-muted-foreground">admin@carent.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
