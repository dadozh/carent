"use client";

import { vehicles, getCustomer, vehicleStatusColors } from "@/lib/mock-data";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Fuel, Gauge, MapPin, Settings, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) return <p>Vehicle not found.</p>;

  const statusLabel: Record<string, string> = {
    available: t("fleet.status.available"),
    rented: t("fleet.status.rented"),
    maintenance: t("fleet.status.maintenance"),
    retired: t("fleet.status.retired"),
  };

  const specs = [
    { label: t("fleet.fuelType"), value: vehicle.fuelType, icon: Fuel },
    { label: t("fleet.transmission"), value: vehicle.transmission, icon: Settings },
    { label: t("fleet.seats"), value: vehicle.seats, icon: Users },
    { label: t("fleet.mileage"), value: `${vehicle.mileage.toLocaleString()} km`, icon: Gauge },
    { label: t("fleet.location"), value: vehicle.location, icon: MapPin },
    { label: t("fleet.category"), value: vehicle.category, icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fleet"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("fleet.backToFleet")}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="relative h-64 bg-muted">
              <Image
                src={vehicle.image}
                alt={`${vehicle.make} ${vehicle.model}`}
                fill
                className="object-cover"
                unoptimized
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
                    {vehicle.year} &middot; {vehicle.plate} &middot; {vehicle.color}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">&euro;{vehicle.dailyRate}</p>
                  <p className="text-sm text-muted-foreground">{t("common.perDay")}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-4">
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
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
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
                <p className="text-sm font-medium">{vehicle.lastService}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t("fleet.nextService")}</p>
                <p className="text-sm font-medium">{vehicle.nextService}</p>
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
                          {rental.startDate} &rarr; {rental.endDate}
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
