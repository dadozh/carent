"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, CalendarDays, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard, exact: true },
    {
      href: "/fleet",
      label: t("nav.fleet"),
      icon: Car,
      activeFor: (p: string) => p === "/fleet" || p.startsWith("/fleet/"),
    },
    { href: "/reservations", label: t("nav.reservations"), icon: CalendarDays },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card">
      {navItems.map((item) => {
        const isActive = item.activeFor
          ? item.activeFor(pathname)
          : item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
