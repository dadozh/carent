"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, CalendarDays, LayoutDashboard, ChevronLeft, ChevronRight, Users, Settings, Contact, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCan } from "@/lib/role-context";
import { usePlanFeature } from "@/lib/plan-context";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();
  const canManageUsers = useCan("manageUsers");
  const canManageSettings = useCan("manageSettings");
  const hasAuditLog = usePlanFeature("auditLog");

  const navItems: { href: string; label: string; icon: React.ElementType; exact?: boolean; activeFor?: (p: string) => boolean }[] = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard, exact: true },
    {
      href: "/fleet",
      label: t("nav.fleet"),
      icon: Car,
      activeFor: (p) => p === "/fleet" || p.startsWith("/fleet/"),
    },
    { href: "/reservations", label: t("nav.reservations"), icon: CalendarDays },
    { href: "/customers", label: t("nav.customers"), icon: Contact },
    ...(canManageUsers ? [{
      href: "/settings/users",
      label: t("nav.users"),
      icon: Users,
      activeFor: (p: string) => p === "/settings/users" || p.startsWith("/settings/users/"),
    }] : []),
    ...(canManageSettings ? [{ href: "/settings", label: t("nav.settings"), icon: Settings, exact: true }] : []),
    ...(canManageSettings && hasAuditLog ? [{ href: "/audit", label: t("nav.auditLog"), icon: ClipboardList }] : []),
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">CARENT</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <Car className="h-7 w-7 text-primary" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-md p-1 hover:bg-muted",
            collapsed && "mx-auto mt-0"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t p-4", collapsed && "p-2")}>
        {!collapsed && (
          <p className="text-xs text-muted-foreground">CARENT v1.0 Prototype</p>
        )}
      </div>
    </aside>
  );
}
