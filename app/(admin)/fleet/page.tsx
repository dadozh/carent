"use client";

import { useState } from "react";
import { type VehicleStatus, type VehicleCategory, vehicleStatusColors } from "@/lib/mock-data";
import { useVehicles } from "@/lib/use-vehicles";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, List, MapPin, Gauge, Fuel, Users, Plus } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { VehiclePhoto } from "@/components/fleet/vehicle-photo";

export default function FleetPage() {
  const { t } = useI18n();
  const { vehicles } = useVehicles();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const statusFilters: { value: VehicleStatus | "all"; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "available", label: t("fleet.status.available") },
    { value: "rented", label: t("fleet.status.rented") },
    { value: "maintenance", label: t("fleet.status.maintenance") },
    { value: "retired", label: t("fleet.status.retired") },
  ];

  const categoryFilters: { value: VehicleCategory | "all"; label: string }[] = [
    { value: "all", label: t("fleet.allTypes") },
    { value: "compact", label: t("fleet.compact") },
    { value: "sedan", label: t("fleet.sedan") },
    { value: "suv", label: t("fleet.suv") },
    { value: "van", label: t("fleet.van") },
    { value: "luxury", label: t("fleet.luxury") },
  ];

  const statusLabels: Record<string, string> = {
    available: t("fleet.status.available"),
    rented: t("fleet.status.rented"),
    maintenance: t("fleet.status.maintenance"),
    retired: t("fleet.status.retired"),
  };

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

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      `${v.make} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("fleet.title")}</h1>
          <p className="text-muted-foreground">
            {vehicles.length} {t("fleet.vehicles")} &middot; {vehicles.filter((v) => v.status === "available").length} {t("fleet.available")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/fleet/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("fleet.addVehicle")}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 rounded-lg border p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("fleet.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 rounded-lg border p-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border p-1">
          {categoryFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((vehicle) => (
            <Link key={vehicle.id} href={`/fleet/${vehicle.id}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-lg cursor-pointer">
                <div className="relative h-40 bg-muted">
                  <VehiclePhoto
                    image={vehicle.image}
                    images={vehicle.images}
                    alt={`${vehicle.make} ${vehicle.model}`}
                  />
                  <Badge
                    className={`absolute top-2 right-2 ${vehicleStatusColors[vehicle.status]}`}
                    variant="secondary"
                  >
                    {statusLabels[vehicle.status]}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.year} &middot; {vehicle.plate}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      &euro;{vehicle.dailyRate}
                      <span className="text-xs font-normal text-muted-foreground">{t("common.perDay")}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getLocationLabel(vehicle.location)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {vehicle.mileage.toLocaleString()} km
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/fleet/${vehicle.id}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  <VehiclePhoto
                    image={vehicle.image}
                    images={vehicle.images}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    iconClassName="h-6 w-6"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.year} &middot; {vehicle.plate} &middot; {getColorLabel(vehicle.color)}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {getLocationLabel(vehicle.location)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" />
                    {vehicle.mileage.toLocaleString()} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5" />
                    {getFuelLabel(vehicle.fuelType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vehicle.seats}
                  </span>
                </div>
                <Badge className={vehicleStatusColors[vehicle.status]} variant="secondary">
                  {statusLabels[vehicle.status]}
                </Badge>
                <p className="font-bold text-primary w-20 text-right">
                  &euro;{vehicle.dailyRate}{t("common.perDay")}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t("fleet.noVehicles")}</p>
        </div>
      )}
    </div>
  );
}
