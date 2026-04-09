"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusColors, type Reservation } from "@/lib/mock-data";
import { Car, CalendarDays, TrendingUp, Wrench, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useVehicles } from "@/lib/use-vehicles";
import { useReservations } from "@/lib/use-reservations";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DashboardPage() {
  const { t } = useI18n();
  const { vehicles } = useVehicles();
  const { reservations } = useReservations();
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const totalVehicles = vehicles.length;
  const available = vehicles.filter((v) => v.status === "available").length;
  const activeRentals = reservations.filter((r) => r.status === "active").length;
  const inMaintenance = vehicles.filter((v) => v.status === "maintenance").length;
  const utilization = totalVehicles > 0
    ? Math.round(((totalVehicles - available - inMaintenance) / totalVehicles) * 100)
    : 0;
  const monthlyRevenue = getMonthlyRevenue(reservations, totalVehicles);
  const totalRevenueLast12Months = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const bestRevenueMonth = monthlyRevenue.reduce((best, month) =>
    month.revenue > best.revenue ? month : best,
    monthlyRevenue[0]
  );

  const now = Date.now();
  const overdueReturns = reservations
    .filter((r) => {
      if (r.status !== "active") return false;
      const returnTs = new Date(`${r.endDate}T${r.returnTime ?? "00:00"}`).getTime();
      return !Number.isNaN(returnTs) && returnTs < now;
    })
    .map((r) => {
      const returnTs = new Date(`${r.endDate}T${r.returnTime ?? "00:00"}`).getTime();
      const overdueMs = now - returnTs;
      return { reservation: r, overdueMs };
    })
    .sort((a, b) => b.overdueMs - a.overdueMs);

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

      {overdueReturns.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("dashboard.overdueReturns")} ({overdueReturns.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("dashboard.overdueReturnsDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueReturns.map(({ reservation, overdueMs }) => (
                <Link
                  key={reservation.id}
                  href="/reservations"
                  className="flex items-center justify-between rounded-lg border border-destructive/20 bg-background p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{reservation.customerName}</p>
                    <p className="text-xs text-muted-foreground">{reservation.vehicleName} · {reservation.vehiclePlate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <Clock className="h-3 w-3" />
                      {formatOverdue(overdueMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.overdueBy")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.monthlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.last12Months")}</p>
                <p className="text-2xl font-bold">&euro;{formatMoney(totalRevenueLast12Months)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.bestMonth")}</p>
                <p className="text-2xl font-bold">{bestRevenueMonth?.label ?? "-"}</p>
                <p className="text-xs text-muted-foreground">&euro;{formatMoney(bestRevenueMonth?.revenue ?? 0)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{t("dashboard.reservations")}</p>
                <p className="text-2xl font-bold">
                  {monthlyRevenue.reduce((sum, month) => sum + month.reservations, 0)}
                </p>
              </div>
            </div>

            <div className="h-72">
              {chartReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...monthlyRevenue].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis
                      yAxisId="revenue"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(value) => `€${Number(value) / 1000}k`}
                    />
                    <YAxis
                      yAxisId="utilization"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "utilization") {
                          return [`${Number(value).toFixed(0)}%`, t("dashboard.fleetUtilization")];
                        }

                        return [`€${formatMoney(Number(value))}`, t("dashboard.income")];
                      }}
                      labelFormatter={(label) => `${t("dashboard.month")}: ${label}`}
                    />
                    <Bar yAxisId="revenue" dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="utilization" dataKey="utilization" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-lg bg-muted/40" />
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {monthlyRevenue.slice(0, 8).map((month) => (
                <div key={month.month} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{month.label}</p>
                    <p className="text-xs text-muted-foreground">{month.reservations}</p>
                  </div>
                  <p className="text-lg font-bold">&euro;{formatMoney(month.revenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {month.utilization}% {t("dashboard.fleetUtilization").toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              {reservations.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {t("res.noBookings")}
                </p>
              ) : (
                reservations.slice(0, 5).map((r) => (
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatOverdue(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatMoney(value: number) {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatMonthLabel(month: string) {
  const [, rawMonth] = month.split("-");
  const monthIndex = Number(rawMonth) - 1;
  const labels = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];
  return `${labels[monthIndex] ?? rawMonth} ${month.slice(2, 4)}`;
}

function getRentalOverlapDays(reservation: Reservation, monthStart: Date, monthEnd: Date) {
  const rentalStart = new Date(`${reservation.startDate}T${reservation.pickupTime || "00:00"}`);
  const rentalEnd = new Date(`${reservation.endDate}T${reservation.returnTime || "23:59"}`);

  if (Number.isNaN(rentalStart.getTime()) || Number.isNaN(rentalEnd.getTime())) return 0;

  const overlapStart = Math.max(rentalStart.getTime(), monthStart.getTime());
  const overlapEnd = Math.min(rentalEnd.getTime(), monthEnd.getTime());

  if (overlapEnd <= overlapStart) return 0;
  return Math.ceil((overlapEnd - overlapStart) / (24 * 60 * 60 * 1000));
}

function getMonthlyRevenue(reservations: Reservation[], fleetSize: number) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month,
      label: formatMonthLabel(month),
      start: date,
      end: nextMonth,
      revenue: 0,
      reservations: 0,
      rentalDays: 0,
      utilization: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.month, month]));

  for (const reservation of reservations) {
    if (reservation.status === "cancelled") continue;

    const month = reservation.startDate.slice(0, 7);
    const item = byMonth.get(month);
    if (!item) continue;

    item.revenue += reservation.totalCost;
    item.reservations += 1;
    item.rentalDays += getRentalOverlapDays(reservation, item.start, item.end);
  }

  for (const item of months) {
    const daysInMonth = Math.round((item.end.getTime() - item.start.getTime()) / (24 * 60 * 60 * 1000));
    const possibleVehicleDays = fleetSize * daysInMonth;
    item.utilization = possibleVehicleDays > 0
      ? Math.min(100, Math.round((item.rentalDays / possibleVehicleDays) * 100))
      : 0;
  }

  return months;
}
