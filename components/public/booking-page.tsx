"use client";

import { useEffect, useMemo, useState } from "react";
import { type Vehicle, type VehicleCategory } from "@/lib/mock-data";
import { calculateCost, effectiveDailyRate } from "@/lib/pricing";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EuropeanDateInput } from "@/components/ui/european-date-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  MapPin,
  Fuel,
  Users,
  Settings,
  Check,
  ChevronRight,
  Shield,
  Star,
  Headphones,
  Navigation,
  Wifi,
  Baby,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  formatDate,
  formatDateRange,
  isoDateToEuropeanInput,
  normalizeEuropeanDateInput,
  parseEuropeanDate,
} from "@/lib/date-format";
import { VehiclePhoto } from "@/components/fleet/vehicle-photo";
import { resolveLocationLabel, type LocationEntry } from "@/lib/location";

type Step = "search" | "select" | "details" | "confirm";

export function PublicBookingPage({
  currency = "EUR",
  tenantSlug,
  tenantName,
  locations,
  availableExtras,
}: {
  currency?: string;
  tenantSlug: string;
  tenantName: string;
  locations: LocationEntry[];
  availableExtras: string[];
}) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>("search");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [error, setError] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [dateInputs, setDateInputs] = useState({ pickupDate: "", returnDate: "", licenseExpiry: "" });
  const [location, setLocation] = useState("all");
  const [category, setCategory] = useState<VehicleCategory | "all">("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [customerDetails, setCustomerDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    license: "",
    licenseExpiry: "",
    address: "",
  });
  const [extras, setExtras] = useState<string[]>([]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const availableVehicles = useMemo(() => vehicles.filter((v) => {
    if (location !== "all" && v.location !== location) return false;
    if (category !== "all" && v.category !== category) return false;
    return true;
  }), [vehicles, location, category]);

  const dayCount =
    pickupDate && returnDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const totalCost = selectedVehicle
    ? calculateCost(dayCount, selectedVehicle.pricingTiers ?? [], selectedVehicle.dailyRate)
    : 0;

  useEffect(() => {
    if (!pickupDate || !returnDate) return;
    const controller = new AbortController();
    setLoadingVehicles(true);
    setError("");

    const params = new URLSearchParams({ startDate: pickupDate, endDate: returnDate });
    fetch(`/api/public/book/${encodeURIComponent(tenantSlug)}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load vehicles: ${response.status}`);
        }
        return response.json() as Promise<{ vehicles?: Vehicle[] }>;
      })
      .then((data) => {
        setVehicles(data.vehicles ?? []);
        setSelectedVehicleId("");
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setVehicles([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load vehicles");
      })
      .finally(() => setLoadingVehicles(false));

    return () => controller.abort();
  }, [pickupDate, returnDate, tenantSlug]);

  const stepList: { key: Step; label: string }[] = [
    { key: "search", label: t("public.steps.search") },
    { key: "select", label: t("public.steps.select") },
    { key: "details", label: t("public.steps.details") },
    { key: "confirm", label: t("public.steps.confirm") },
  ];
  const currentStepIndex = stepList.findIndex((s) => s.key === step);

  function setEuropeanDateInput(key: keyof typeof dateInputs, value: string) {
    const nextValue = normalizeEuropeanDateInput(value);
    const parsedDate = parseEuropeanDate(nextValue);

    setDateInputs((current) => ({ ...current, [key]: nextValue }));

    if (key === "pickupDate") {
      setPickupDate(parsedDate);
      return;
    }
    if (key === "returnDate") {
      setReturnDate(parsedDate);
      return;
    }

    setCustomerDetails((current) => ({ ...current, licenseExpiry: parsedDate }));
  }

  function setIsoDateInput(key: keyof typeof dateInputs, value: string) {
    setDateInputs((current) => ({ ...current, [key]: isoDateToEuropeanInput(value) }));

    if (key === "pickupDate") {
      setPickupDate(value);
      return;
    }
    if (key === "returnDate") {
      setReturnDate(value);
      return;
    }

    setCustomerDetails((current) => ({ ...current, licenseExpiry: value }));
  }

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
    return resolveLocationLabel(value, locale, locations);
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

  const extraLabels: Record<string, string> = {
    GPS: t("booking.gps"),
    "Wi-Fi": t("booking.wifi"),
    "Child Seat": t("booking.childSeat"),
  };

  const toggleExtra = (extra: string) => {
    setExtras((prev) =>
      prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]
    );
  };

  async function submitBooking() {
    if (!selectedVehicle || !pickupDate || !returnDate) return;
    setSubmittingBooking(true);
    setError("");

    try {
      const response = await fetch(`/api/public/book/${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          startDate: pickupDate,
          endDate: returnDate,
          pickupLocation: location === "all" ? selectedVehicle.location : location,
          returnLocation: location === "all" ? selectedVehicle.location : location,
          extras,
          customer: {
            firstName: customerDetails.firstName,
            lastName: customerDetails.lastName,
            email: customerDetails.email,
            phone: customerDetails.phone,
            licenseNumber: customerDetails.license,
            licenseExpiry: customerDetails.licenseExpiry,
            address: customerDetails.address,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to complete booking");

      setBookingRef(`${tenantSlug.toUpperCase()}-${data.reservation.id}`);
      setStep("confirm");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete booking");
    } finally {
      setSubmittingBooking(false);
    }
  }

  return (
    <div>
      {step === "search" && (
        <div className="bg-gradient-to-br from-primary/90 to-primary py-20 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("public.hero")}
            </h1>
            <p className="mt-4 text-lg text-white/80">{tenantName}</p>
            <p className="mt-2 text-base text-white/80">{t("public.heroSub")}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8">
        {step !== "search" && (
          <div className="mb-8 flex items-center justify-center gap-2">
            {stepList.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    i <= currentStepIndex ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i <= currentStepIndex ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < stepList.length - 1 && (
                  <div className={`h-0.5 w-8 ${i < currentStepIndex ? "bg-primary" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === "search" && (
          <div className="-mt-12">
            <Card className="mx-auto max-w-3xl shadow-lg">
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.pickupDate")}</label>
                    <EuropeanDateInput
                      displayValue={dateInputs.pickupDate}
                      isoValue={pickupDate}
                      onDisplayChange={(value) => setEuropeanDateInput("pickupDate", value)}
                      onIsoChange={(value) => setIsoDateInput("pickupDate", value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.returnDate")}</label>
                    <EuropeanDateInput
                      displayValue={dateInputs.returnDate}
                      isoValue={returnDate}
                      onDisplayChange={(value) => setEuropeanDateInput("returnDate", value)}
                      onIsoChange={(value) => setIsoDateInput("returnDate", value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.location")}</label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="all">{t("public.allLocations")}</option>
                      {locations.map((item) => (
                        <option key={item.key} value={item.key}>{getLocationLabel(item.key)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.vehicleType")}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as VehicleCategory | "all")}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="all">{t("public.allTypes")}</option>
                      <option value="compact">{t("fleet.compact")}</option>
                      <option value="sedan">{t("fleet.sedan")}</option>
                      <option value="suv">{t("fleet.suv")}</option>
                      <option value="van">{t("fleet.van")}</option>
                      <option value="luxury">{t("fleet.luxury")}</option>
                    </select>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={() => setStep("select")}
                  disabled={!pickupDate || !returnDate}
                >
                  <Car className="mr-2 h-5 w-5" />
                  {loadingVehicles ? t("common.loading") : t("public.searchVehicles")}
                </Button>
              </CardContent>
            </Card>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {[
                { icon: Star, title: t("public.benefit1Title"), desc: t("public.benefit1Desc") },
                { icon: Shield, title: t("public.benefit2Title"), desc: t("public.benefit2Desc") },
                { icon: Headphones, title: t("public.benefit3Title"), desc: t("public.benefit3Desc") },
              ].map((b) => (
                <div key={b.title} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "select" && (
          <div>
            <h2 className="mb-1 text-xl font-bold">{t("public.availableVehicles")}</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {formatDateRange(pickupDate, returnDate)} &middot; {dayCount} {dayCount === 1 ? t("common.day") : t("common.days")}
            </p>

            {loadingVehicles ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t("common.loading")}</CardContent></Card>
            ) : availableVehicles.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{t("public.noVehicles")}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {availableVehicles.map((v) => (
                  <Card
                    key={v.id}
                    className={`overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${selectedVehicleId === v.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedVehicleId(v.id)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-48 sm:h-auto sm:w-64 bg-muted shrink-0">
                        <VehiclePhoto image={v.image} images={v.images} alt={`${v.make} ${v.model}`} />
                      </div>
                      <CardContent className="flex flex-1 items-center justify-between p-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{v.make} {v.model}</h3>
                            <Badge variant="outline" className="capitalize text-xs">{getCategoryLabel(v.category)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{v.year} &middot; {getColorLabel(v.color)}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {getFuelLabel(v.fuelType)}</span>
                            <span className="flex items-center gap-1"><Settings className="h-3.5 w-3.5" /> {getTransmissionLabel(v.transmission)}</span>
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {v.seats} {t("fleet.seats").toLowerCase()}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {getLocationLabel(v.location)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-bold text-primary">{formatMoney(calculateCost(dayCount, v.pricingTiers ?? [], v.dailyRate), currency)}</p>
                          <p className="text-xs text-muted-foreground">{formatMoneyCompact(effectiveDailyRate(dayCount, v.pricingTiers ?? [], v.dailyRate), currency)}{t("common.perDay")} &times; {dayCount}d</p>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicleId(v.id);
                              setStep("details");
                            }}
                          >
                            {t("public.bookThisVehicle")}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("search")}>{t("common.back")}</Button>
              {selectedVehicleId && <Button onClick={() => setStep("details")}>{t("common.next")} <ChevronRight className="ml-1 h-4 w-4" /></Button>}
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">{t("public.yourDetails")}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.firstName")}</label>
                      <Input value={customerDetails.firstName} onChange={(e) => setCustomerDetails({ ...customerDetails, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.lastName")}</label>
                      <Input value={customerDetails.lastName} onChange={(e) => setCustomerDetails({ ...customerDetails, lastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.email")}</label>
                      <Input type="email" value={customerDetails.email} onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.phone")}</label>
                      <Input value={customerDetails.phone} onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("public.licenseNumber")}</label>
                      <Input value={customerDetails.license} onChange={(e) => setCustomerDetails({ ...customerDetails, license: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("booking.licenseExpiry")}</label>
                      <EuropeanDateInput
                        displayValue={dateInputs.licenseExpiry}
                        isoValue={customerDetails.licenseExpiry}
                        onDisplayChange={(value) => setEuropeanDateInput("licenseExpiry", value)}
                        onIsoChange={(value) => setIsoDateInput("licenseExpiry", value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("booking.address")}</label>
                      <Input value={customerDetails.address} onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">{t("booking.extras")}</h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {availableExtras.map((extra) => {
                      const Icon = extra === "GPS" ? Navigation : extra === "Wi-Fi" ? Wifi : Baby;
                      return (
                      <button
                        key={extra}
                        type="button"
                        onClick={() => toggleExtra(extra)}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                          extras.includes(extra) ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">{extraLabels[extra] ?? extra}</span>
                        {extras.includes(extra) && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    )})}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">{t("public.bookingSummary")}</h3>
                  {selectedVehicle && (
                    <div className="relative mb-4 h-36 overflow-hidden rounded-lg bg-muted">
                      <VehiclePhoto image={selectedVehicle.image} images={selectedVehicle.images} alt={`${selectedVehicle.make} ${selectedVehicle.model}`} />
                    </div>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("res.vehicle")}</span><span className="font-medium">{selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.pickup")}</span><span className="font-medium">{formatDate(pickupDate)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.return")}</span><span className="font-medium">{formatDate(returnDate)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.duration")}</span><span className="font-medium">{dayCount} {t("common.days")}</span></div>
                    {extras.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.extras")}</span>
                        <span className="font-medium">{extras.map((extra) => extraLabels[extra] ?? extra).join(", ")}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-bold"><span>{t("common.total")}</span><span className="text-primary">{formatMoney(totalCost, currency)}</span></div>
                  </div>
                  <Button className="mt-4 w-full" onClick={submitBooking} disabled={submittingBooking}>
                    {submittingBooking ? t("common.loading") : t("public.completeBooking")}
                  </Button>
                  <Button variant="outline" className="mt-2 w-full" onClick={() => setStep("select")}>{t("common.back")}</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="mx-auto max-w-lg text-center py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">{t("public.bookingConfirmed")}</h2>
            <p className="mt-2 text-muted-foreground">{t("public.confirmationMsg")}</p>

            <Card className="mt-8 text-left">
              <CardContent className="p-6 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("public.bookingRef")}</span><span className="font-mono font-bold">{bookingRef}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("res.vehicle")}</span><span className="font-medium">{selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("res.customer")}</span><span className="font-medium">{customerDetails.firstName} {customerDetails.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.pickup")}</span><span className="font-medium">{formatDate(pickupDate)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.return")}</span><span className="font-medium">{formatDate(returnDate)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>{t("common.total")}</span><span className="text-primary">{formatMoney(totalCost, currency)}</span></div>
              </CardContent>
            </Card>

            <Button className="mt-6" onClick={() => {
              setStep("search");
              setSelectedVehicleId("");
              setExtras([]);
              setBookingRef("");
            }}>
              {t("public.backToHome")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
