"use client";

import { getCustomer, vehicleStatusColors } from "@/lib/mock-data";
import { useVehicles } from "@/lib/use-vehicles";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Fuel, Gauge, MapPin, Settings, Users, Pencil } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateRange } from "@/lib/date-format";
import { VehiclePhoto } from "@/components/fleet/vehicle-photo";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { getVehicle, isLoading } = useVehicles();
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

  const specs = [
    { label: t("fleet.fuelType"), value: getFuelLabel(vehicle.fuelType), icon: Fuel },
    { label: t("fleet.transmission"), value: getTransmissionLabel(vehicle.transmission), icon: Settings },
    { label: t("fleet.seats"), value: vehicle.seats, icon: Users },
    { label: t("fleet.mileage"), value: `${vehicle.mileage.toLocaleString()} km`, icon: Gauge },
    { label: t("fleet.location"), value: getLocationLabel(vehicle.location), icon: MapPin },
    { label: t("fleet.category"), value: getCategoryLabel(vehicle.category), icon: Calendar },
  ];

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
        <Link href={`/fleet/${vehicle.id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
        </Link>
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
              <CardTitle>{t("fleet.maintenanceLog")}</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>{t("fleet.serviceSchedule")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t("fleet.lastService")}</p>
                <p className="text-sm font-medium">{formatDate(vehicle.lastService)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t("fleet.nextService")}</p>
                <p className="text-sm font-medium">{formatDate(vehicle.nextService)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fleet.rentalHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.rentalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("fleet.noRentals")}</p>
              ) : (
                <div className="space-y-3">
                  {vehicle.rentalHistory.map((rental, i) => {
                    const customer = getCustomer(rental.customerId);
                    return (
                      <div key={i} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">
                          {customer ? `${customer.firstName} ${customer.lastName}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(rental.startDate, rental.endDate)}
                        </p>
                        <p className="text-sm font-medium text-primary mt-1">
                          &euro;{rental.revenue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
