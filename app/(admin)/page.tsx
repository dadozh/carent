"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { vehicles, reservations, statusColors } from "@/lib/mock-data";
import { Car, CalendarDays, TrendingUp, Wrench } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useI18n();

  const totalVehicles = vehicles.length;
  const available = vehicles.filter((v) => v.status === "available").length;
  const activeRentals = reservations.filter((r) => r.status === "active").length;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
  const utilization = Math.round(
    ((totalVehicles - available - inMaintenance) / totalVehicles) * 100
  );

  const kpis = [
    { label: t("dashboard.totalVehicles"), value: totalVehicles, icon: Car, color: "text-blue-600" },
    { label: t("dashboard.activeRentals"), value: activeRentals, icon: CalendarDays, color: "text-green-600" },
    { label: t("dashboard.fleetUtilization"), value: `${utilization}%`, icon: TrendingUp, color: "text-amber-600" },
    { label: t("dashboard.inMaintenance"), value: inMaintenance, icon: Wrench, color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg bg-muted p-3 ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link
              href="/reservations"
              className="flex items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              <CalendarDays className="h-5 w-5 text-primary" />
              {t("dashboard.newBooking")}
            </Link>
            <Link
              href="/fleet"
              className="flex items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Car className="h-5 w-5 text-primary" />
              {t("dashboard.viewFleet")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.recentBookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reservations.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{r.customerName}</p>
                    <p className="text-xs text-muted-foreground">{r.vehicleName}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status]}`}
                    >
                      {t(`res.status.${r.status}` as const)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      &euro;{r.totalCost}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
