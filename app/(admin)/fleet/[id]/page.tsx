"use client";

import { useState } from "react";
import { vehicleStatusColors } from "@/lib/mock-data";
import { useVehicles } from "@/lib/use-vehicles";
import { useReservations } from "@/lib/use-reservations";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Fuel, Gauge, MapPin, Settings, Users, Pencil, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/role-context";
import { usePlanFeature } from "@/lib/plan-context";
import { EuropeanDateInput } from "@/components/ui/european-date-input";
import { formatDate, formatDateRange, isoDateToEuropeanInput, normalizeEuropeanDateInput, parseEuropeanDate } from "@/lib/date-format";
import { VehiclePhoto } from "@/components/fleet/vehicle-photo";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { getVehicle, updateVehicle, isLoading } = useVehicles();
  const { reservations } = useReservations();
  const canManageFleet = useCan("manageFleet");
  const hasAnalytics = usePlanFeature("analytics");
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [maintenanceDateInput, setMaintenanceDateInput] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [maintenanceMileage, setMaintenanceMileage] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenanceStatus, setMaintenanceStatus] = useState<"available" | "maintenance">("available");
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const vehicle = getVehicle(id);

  if (isLoading) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!vehicle) return <p>{t("fleet.notFound")}</p>;

  const statusLabel: Record<string, string> = {
    available: t("fleet.status.available"),
    rented: t("fleet.status.rented"),
    maintenance: t("fleet.status.maintenance"),
    retired: t("fleet.status.retired"),
  };

  function getCategoryLabel(value: string) {
    const labels: Record<string, string> = {
      compact: t("fleet.compact"),
      sedan: t("fleet.sedan"),
      suv: t("fleet.suv"),
      van: t("fleet.van"),
      luxury: t("fleet.luxury"),
    };
    return labels[value] ?? value;
  }

  function getFuelLabel(value: string) {
    const labels: Record<string, string> = {
      Gasoline: t("vehicleForm.fuel.gasoline"),
      Diesel: t("vehicleForm.fuel.diesel"),
      Hybrid: t("vehicleForm.fuel.hybrid"),
      Electric: t("vehicleForm.fuel.electric"),
      LPG: t("vehicleForm.fuel.lpg"),
    };
    return labels[value] ?? value;
  }

  function getTransmissionLabel(value: string) {
    const labels: Record<string, string> = {
      Automatic: t("vehicleForm.transmission.automatic"),
      Manual: t("vehicleForm.transmission.manual"),
      CVT: t("vehicleForm.transmission.cvt"),
      "Semi-Auto": t("vehicleForm.transmission.semiAuto"),
    };
    return labels[value] ?? value;
  }

  function getLocationLabel(value: string) {
    const labels: Record<string, string> = {
      Airport: t("public.airport"),
      Downtown: t("public.downtown"),
      Workshop: t("vehicleForm.location.workshop"),
      Storage: t("vehicleForm.location.storage"),
    };
    return labels[value] ?? value;
  }

  function getColorLabel(value: string) {
    const labels: Record<string, string> = {
      White: t("vehicleForm.color.white"),
      Black: t("vehicleForm.color.black"),
      Silver: t("vehicleForm.color.silver"),
      Gray: t("vehicleForm.color.gray"),
      Blue: t("vehicleForm.color.blue"),
      Red: t("vehicleForm.color.red"),
      Green: t("vehicleForm.color.green"),
      Yellow: t("vehicleForm.color.yellow"),
      Orange: t("vehicleForm.color.orange"),
      Brown: t("vehicleForm.color.brown"),
      Beige: t("vehicleForm.color.beige"),
      Gold: t("vehicleForm.color.gold"),
      Purple: t("vehicleForm.color.purple"),
      Other: t("vehicleForm.color.other"),
    };
    return labels[value] ?? value;
  }

  const vehicleReservations = reservations.filter((r) => r.vehicleId === vehicle.id);
  const completedRentals = vehicleReservations.filter((r) => r.status === "completed");
  const totalRevenue = completedRentals.reduce((sum, r) => sum + r.totalCost, 0);
  const avgPerRental = completedRentals.length > 0 ? Math.round(totalRevenue / completedRentals.length) : 0;
  const activeNow = vehicleReservations.filter((r) => r.status === "active").length;
  const recentRentals = vehicleReservations
    .filter((r) => r.status !== "cancelled")
    .slice(0, 5);

  const specs = [
    { label: t("fleet.fuelType"), value: getFuelLabel(vehicle.fuelType), icon: Fuel },
    { label: t("fleet.transmission"), value: getTransmissionLabel(vehicle.transmission), icon: Settings },
    { label: t("fleet.seats"), value: vehicle.seats, icon: Users },
    { label: t("fleet.mileage"), value: `${vehicle.mileage.toLocaleString()} km`, icon: Gauge },
    { label: t("fleet.location"), value: getLocationLabel(vehicle.location), icon: MapPin },
    { label: t("fleet.category"), value: getCategoryLabel(vehicle.category), icon: Calendar },
  ];

  function openMaintenanceDialog() {
    const today = new Date().toISOString().slice(0, 10);
    setMaintenanceDate(today);
    setMaintenanceDateInput(isoDateToEuropeanInput(today));
    setMaintenanceType("");
    setMaintenanceCost("");
    setMaintenanceMileage(String(vehicle.mileage));
    setMaintenanceNotes("");
    setMaintenanceStatus(vehicle.status === "maintenance" ? "maintenance" : "available");
    setShowMaintenanceDialog(true);
  }

  async function handleSaveMaintenance() {
    if (!maintenanceDate || !maintenanceType.trim()) return;

    setSavingMaintenance(true);
    try {
      await updateVehicle(vehicle.id, {
        status: maintenanceStatus,
        lastService: maintenanceDate,
        maintenanceLog: [
          {
            date: maintenanceDate,
            type: maintenanceType.trim(),
            cost: Number(maintenanceCost) > 0 ? Number(maintenanceCost) : 0,
            mileage: Number(maintenanceMileage) > 0 ? Number(maintenanceMileage) : vehicle.mileage,
            notes: maintenanceNotes.trim(),
          },
          ...vehicle.maintenanceLog,
        ],
      });
      setShowMaintenanceDialog(false);
    } finally {
      setSavingMaintenance(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/fleet"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("fleet.backToFleet")}
        </Link>
        {canManageFleet && (
          <Link href={`/fleet/${vehicle.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="relative h-64 bg-muted">
              <VehiclePhoto
                image={vehicle.image}
                images={vehicle.images}
                alt={`${vehicle.make} ${vehicle.model}`}
                iconClassName="h-12 w-12"
              />
              <Badge
                className={`absolute top-4 right-4 text-sm ${vehicleStatusColors[vehicle.status]}`}
                variant="secondary"
              >
                {statusLabel[vehicle.status]}
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {vehicle.make} {vehicle.model}
                  </h1>
                  <p className="text-muted-foreground">
                    {vehicle.year} &middot; {vehicle.plate} &middot; {getColorLabel(vehicle.color)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">&euro;{vehicle.dailyRate}</p>
                  <p className="text-sm text-muted-foreground">{t("common.perDay")}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex items-center gap-2">
                    <spec.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{spec.label}</p>
                      <p className="text-sm font-medium capitalize">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{t("fleet.maintenanceLog")}</CardTitle>
                {canManageFleet && (
                  <Button variant="outline" size="sm" onClick={openMaintenanceDialog}>
                    {t("fleet.addMaintenanceEntry")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {vehicle.maintenanceLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("fleet.noMaintenance")}</p>
              ) : (
                <div className="space-y-3">
                  {vehicle.maintenanceLog.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{entry.type}</p>
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                        {typeof entry.mileage === "number" && (
                          <p className="text-xs text-muted-foreground">{entry.mileage.toLocaleString()} km</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">&euro;{entry.cost}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {hasAnalytics ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("fleet.revenueStats")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t("fleet.totalRevenue")}</p>
                <p className="text-2xl font-bold text-primary">&euro;{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("fleet.completedRentals")}</p>
                  <p className="text-lg font-semibold">{completedRentals.length}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("fleet.avgPerRental")}</p>
                  <p className="text-lg font-semibold">&euro;{avgPerRental}</p>
                </div>
              </div>
              {activeNow > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs text-green-700 font-medium">{t("fleet.activeNow")}</p>
                </div>
              )}
            </CardContent>
          </Card>
          ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">{t("fleet.revenueStats")}</p>
              <p className="text-xs text-muted-foreground">Available on Pro &amp; Enterprise</p>
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("fleet.rentalHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRentals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("fleet.noRentals")}</p>
              ) : (
                <div className="space-y-3">
                  {recentRentals.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{r.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateRange(r.startDate, r.endDate)}
                      </p>
                      <p className="text-sm font-medium text-primary mt-1">&euro;{r.totalCost}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showMaintenanceDialog} onOpenChange={(open) => { if (!open) setShowMaintenanceDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fleet.addMaintenanceEntry")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.maintenanceDate")}</label>
              <EuropeanDateInput
                displayValue={maintenanceDateInput}
                isoValue={maintenanceDate}
                ariaLabel={t("fleet.maintenanceDate")}
                onDisplayChange={(value) => {
                  const next = normalizeEuropeanDateInput(value);
                  setMaintenanceDateInput(next);
                  setMaintenanceDate(parseEuropeanDate(next));
                }}
                onIsoChange={(value) => {
                  setMaintenanceDateInput(isoDateToEuropeanInput(value));
                  setMaintenanceDate(value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.maintenanceType")}</label>
              <Input
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                placeholder={t("fleet.maintenanceTypePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.maintenanceCost")}</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={maintenanceCost}
                onChange={(e) => setMaintenanceCost(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.maintenanceMileage")}</label>
              <Input
                type="number"
                min="0"
                value={maintenanceMileage}
                onChange={(e) => setMaintenanceMileage(e.target.value)}
                placeholder={String(vehicle.mileage)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.maintenanceNotes")}</label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                placeholder={t("fleet.maintenanceNotesPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("fleet.statusAfterMaintenance")}</label>
              <Select value={maintenanceStatus} onValueChange={(value) => setMaintenanceStatus(value as "available" | "maintenance")}>
                <SelectTrigger>
                  <SelectValue placeholder={maintenanceStatus === "maintenance" ? t("fleet.status.maintenance") : t("fleet.status.available")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("fleet.status.available")}</SelectItem>
                  <SelectItem value="maintenance">{t("fleet.status.maintenance")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!maintenanceDate || !maintenanceType.trim() || savingMaintenance}
              onClick={() => void handleSaveMaintenance()}
            >
              {savingMaintenance ? t("common.save") : t("fleet.saveMaintenanceEntry")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
