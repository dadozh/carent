"use client";

import { useEffect, useRef, useState } from "react";
import {
  statusColors,
  type Customer,
  type Reservation,
  type ReservationStatus,
} from "@/lib/mock-data";
import {
  RESERVATION_BLOCKING_STATUSES,
  reservationBlocksPeriod,
} from "@/lib/reservation-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EuropeanDateInput } from "@/components/ui/european-date-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  X,
  MapPin,
  Calendar,
  User,
  Car,
  ChevronRight,
  ChevronLeft,
  Check,
  Navigation,
  Wifi,
  Baby,
  FileText,
  ImagePlus,
  Upload,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useVehicles } from "@/lib/use-vehicles";
import { useReservations } from "@/lib/use-reservations";
import { uploadFiles } from "@/lib/storage";
import Image from "next/image";
import {
  formatDate,
  formatDateTimeRange,
  isoDateToEuropeanInput,
  normalizeEuropeanDateInput,
  parseEuropeanDate,
} from "@/lib/date-format";

const extraIcons: Record<string, typeof Navigation> = {
  GPS: Navigation,
  "Wi-Fi": Wifi,
  "Child Seat": Baby,
};

const EXTRAS = ["GPS", "Wi-Fi", "Child Seat"] as const;

type BookingStep = "dates" | "vehicle" | "customer" | "extras" | "summary";
type CustomerMode = "existing" | "new";

function normalizePhotoUrls(images: Array<string | null | undefined>) {
  return images
    .map((image) => image?.trim() ?? "")
    .filter((image): image is string => image.length > 0);
}

const initialBooking = {
  startDate: "",
  pickupTime: "09:00",
  endDate: "",
  returnTime: "09:00",
  pickupLocation: "Airport",
  returnLocation: "Airport",
  vehicleId: "",
  customerId: "",
  extras: [] as string[],
  images: [] as string[],
};

const initialCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  licenseNumber: "",
  licenseExpiry: "",
  address: "",
  images: [] as string[],
};

export default function ReservationsPage() {
  const { t } = useI18n();
  const { vehicles } = useVehicles();
  const {
    customers,
    addCustomer,
    addReservation,
    cancelReservation,
    updateCustomerImages,
    updateReservationImages,
  } = useReservations({ loadReservations: false });
  const newCustomerFileRef = useRef<HTMLInputElement>(null);
  const newReservationFileRef = useRef<HTMLInputElement>(null);
  const customerDetailFileRef = useRef<HTMLInputElement>(null);
  const reservationDetailFileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleFilterAvailable, setVehicleFilterAvailable] = useState(false);
  const [vehicleFilterTransmission, setVehicleFilterTransmission] = useState("");
  const [vehicleFilterCategory, setVehicleFilterCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockingReservations, setBlockingReservations] = useState<Reservation[]>([]);
  const [reservationTotal, setReservationTotal] = useState(0);
  const [reservationsReloadKey, setReservationsReloadKey] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("dates");
  const [customerMode, setCustomerMode] = useState<CustomerMode>("existing");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const [newBooking, setNewBooking] = useState(initialBooking);
  const [newCustomer, setNewCustomer] = useState(initialCustomer);
  const [dateInputs, setDateInputs] = useState({
    startDate: "",
    endDate: "",
    licenseExpiry: "",
  });
  const [filterDates, setFilterDates] = useState({
    startDate: "",
    endDate: "",
  });
  const [filterDateInputs, setFilterDateInputs] = useState({
    startDate: "",
    endDate: "",
  });

  const selectedVehicle = vehicles.find((v) => v.id === newBooking.vehicleId);
  const selectedCustomer = customers.find((c) => c.id === newBooking.customerId);
  const selectedReservationCustomer = selectedReservation
    ? customers.find((c) => c.id === selectedReservation.customerId)
    : null;
  const rentalDurationMs = getRentalDurationMs(
    newBooking.startDate,
    newBooking.pickupTime,
    newBooking.endDate,
    newBooking.returnTime
  );
  const rentalDateError = getRentalDateError();
  const dayCount = rentalDurationMs >= 24 * 60 * 60 * 1000
    ? Math.ceil(rentalDurationMs / (1000 * 60 * 60 * 24))
    : 0;
  const totalCost = selectedVehicle ? selectedVehicle.dailyRate * dayCount : 0;
  const customerError = getCustomerError();

  const statusFilters: { value: ReservationStatus | "all"; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "active", label: t("res.status.active") },
    { value: "confirmed", label: t("res.status.confirmed") },
    { value: "pending", label: t("res.status.pending") },
    { value: "completed", label: t("res.status.completed") },
    { value: "cancelled", label: t("res.status.cancelled") },
  ];

  const steps: { key: BookingStep; label: string }[] = [
    { key: "dates", label: t("booking.datesLocation") },
    { key: "vehicle", label: t("booking.selectVehicle") },
    { key: "customer", label: t("booking.customer") },
    { key: "extras", label: t("booking.extras") },
    { key: "summary", label: t("booking.summary") },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === bookingStep);

  const statusLabels: Record<ReservationStatus, string> = {
    pending: t("res.status.pending"),
    confirmed: t("res.status.confirmed"),
    active: t("res.status.active"),
    completed: t("res.status.completed"),
    cancelled: t("res.status.cancelled"),
  };

  const locationLabels: Record<string, string> = {
    Airport: t("public.airport"),
    Downtown: t("public.downtown"),
  };

  const extraLabels: Record<string, string> = {
    GPS: t("booking.gps"),
    "Wi-Fi": t("booking.wifi"),
    "Child Seat": t("booking.childSeat"),
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (filterDates.startDate) params.set("dateFrom", filterDates.startDate);
      if (filterDates.endDate) params.set("dateTo", filterDates.endDate);
      params.set("limit", "250");

      fetch(`/api/reservations?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Failed to load reservations: ${response.status}`);
          return response.json() as Promise<{ reservations?: Reservation[]; total?: number }>;
        })
        .then((data) => {
          setReservations(data.reservations ?? []);
          setReservationTotal(data.total ?? data.reservations?.length ?? 0);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error(error);
        });
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filterDates.endDate, filterDates.startDate, reservationsReloadKey, search, statusFilter]);

  useEffect(() => {
    if (!newBooking.startDate || !newBooking.endDate) {
      setBlockingReservations([]);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      status: RESERVATION_BLOCKING_STATUSES.join(","),
      dateFrom: newBooking.startDate,
      dateTo: newBooking.endDate,
      limit: "10000",
    });

    fetch(`/api/reservations?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load blocking reservations: ${response.status}`);
        return response.json() as Promise<{ reservations?: Reservation[] }>;
      })
      .then((data) => setBlockingReservations(data.reservations ?? []))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
      });

    return () => controller.abort();
  }, [newBooking.endDate, newBooking.startDate, reservationsReloadKey]);

  function getTransmissionLabel(value: string) {
    const labels: Record<string, string> = {
      Automatic: t("vehicleForm.transmission.automatic"),
      Manual: t("vehicleForm.transmission.manual"),
      CVT: t("vehicleForm.transmission.cvt"),
      "Semi-Auto": t("vehicleForm.transmission.semiAuto"),
    };
    return labels[value] ?? value;
  }

  function resetWizard() {
    setNewBooking(initialBooking);
    setNewCustomer(initialCustomer);
    setDateInputs({ startDate: "", endDate: "", licenseExpiry: "" });
    setCustomerMode(customers.length > 0 ? "existing" : "new");
    setBookingStep("dates");
    setSaving(false);
    setCustomerSearch("");
    setVehicleSearch("");
    setVehicleFilterAvailable(false);
    setVehicleFilterTransmission("");
    setVehicleFilterCategory("");
  }

  function setEuropeanDateInput(key: keyof typeof dateInputs, value: string) {
    const nextValue = normalizeEuropeanDateInput(value);
    const parsedDate = parseEuropeanDate(nextValue);

    setDateInputs((current) => ({ ...current, [key]: nextValue }));

    if (key === "licenseExpiry") {
      setNewCustomer((current) => ({ ...current, licenseExpiry: parsedDate }));
      return;
    }

    setNewBooking((current) => ({ ...current, [key]: parsedDate }));
  }

  function setIsoDateInput(key: keyof typeof dateInputs, value: string) {
    setDateInputs((current) => ({ ...current, [key]: isoDateToEuropeanInput(value) }));

    if (key === "licenseExpiry") {
      setNewCustomer((current) => ({ ...current, licenseExpiry: value }));
      return;
    }

    setNewBooking((current) => ({ ...current, [key]: value }));
  }

  function setFilterEuropeanDateInput(key: keyof typeof filterDateInputs, value: string) {
    const nextValue = normalizeEuropeanDateInput(value);
    const parsedDate = parseEuropeanDate(nextValue);

    setFilterDateInputs((current) => ({ ...current, [key]: nextValue }));
    setFilterDates((current) => ({ ...current, [key]: parsedDate }));
  }

  function setFilterIsoDateInput(key: keyof typeof filterDateInputs, value: string) {
    setFilterDateInputs((current) => ({ ...current, [key]: isoDateToEuropeanInput(value) }));
    setFilterDates((current) => ({ ...current, [key]: value }));
  }

  function clearReservationFilters() {
    setSearch("");
    setStatusFilter("all");
    setFilterDates({ startDate: "", endDate: "" });
    setFilterDateInputs({ startDate: "", endDate: "" });
  }

  function openNewBooking() {
    resetWizard();
    setSelectedReservation(null);
    setShowNewBooking(true);
  }

  function formatReservationPeriod(reservation: Reservation) {
    return formatDateTimeRange(
      reservation.startDate,
      reservation.pickupTime,
      reservation.endDate,
      reservation.returnTime
    );
  }

  function getNewCustomerName() {
    return `${newCustomer.firstName.trim()} ${newCustomer.lastName.trim()}`.trim();
  }

  function customerFormIsValid() {
    return !getCustomerError();
  }

  function getRentalDurationMs(startDate: string, pickupTime: string, endDate: string, returnTime: string) {
    if (!startDate || !pickupTime || !endDate || !returnTime) return 0;

    const pickup = new Date(`${startDate}T${pickupTime}`);
    const dropoff = new Date(`${endDate}T${returnTime}`);

    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return 0;

    return dropoff.getTime() - pickup.getTime();
  }

  function getRentalDateError() {
    if (newBooking.startDate && newBooking.pickupTime && getRentalStart().getTime() < currentTime) {
      return t("booking.pickupInPast");
    }

    if (!newBooking.startDate || !newBooking.pickupTime || !newBooking.endDate || !newBooking.returnTime) {
      return "";
    }
    if (rentalDurationMs <= 0) return t("booking.returnBeforePickup");
    if (rentalDurationMs < 24 * 60 * 60 * 1000) return t("booking.minimumDuration");
    return "";
  }

  function getRentalStart() {
    return new Date(`${newBooking.startDate}T${newBooking.pickupTime}`);
  }

  function getRentalEnd() {
    return new Date(`${newBooking.endDate}T${newBooking.returnTime}`);
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalize(value: string) {
    return value.trim().toLowerCase();
  }

  function customerHasDuplicate() {
    const email = normalize(newCustomer.email);
    const licenseNumber = normalize(newCustomer.licenseNumber);

    return customers.some((customer) =>
      normalize(customer.email) === email || normalize(customer.licenseNumber) === licenseNumber
    );
  }

  function licenseIsValidThroughReturn(customer: Pick<Customer, "licenseExpiry">) {
    if (!customer.licenseExpiry || !newBooking.endDate || !newBooking.returnTime) return false;

    const licenseExpiry = new Date(`${customer.licenseExpiry}T23:59`);
    return !Number.isNaN(licenseExpiry.getTime()) && licenseExpiry >= getRentalEnd();
  }

  function getCustomerError() {
    if (customerMode === "existing") {
      if (!selectedCustomer) return "";
      return licenseIsValidThroughReturn(selectedCustomer) ? "" : t("booking.licenseMustCoverReturn");
    }

    if (!newCustomer.firstName.trim() || !newCustomer.lastName.trim()) return t("booking.customerNameRequired");
    if (!newCustomer.email.trim() || !isValidEmail(newCustomer.email)) return t("booking.validEmailRequired");
    if (!newCustomer.phone.trim() || newCustomer.phone.trim().length < 6) return t("booking.validPhoneRequired");
    if (!newCustomer.licenseNumber.trim()) return t("booking.licenseRequired");
    if (!newCustomer.licenseExpiry) return t("booking.licenseExpiryRequired");
    if (customerHasDuplicate()) return t("booking.duplicateCustomer");
    if (!licenseIsValidThroughReturn(newCustomer)) return t("booking.licenseMustCoverReturn");

    return "";
  }

  function reservationIntervalsOverlap(reservation: Reservation) {
    if (!newBooking.startDate || !newBooking.pickupTime || !newBooking.endDate || !newBooking.returnTime) {
      return false;
    }

    const start = getRentalStart().getTime();
    const end = getRentalEnd().getTime();
    return reservationBlocksPeriod(reservation, start, end);
  }

  function vehicleHasConflict(vehicleId: string) {
    return blockingReservations.some((reservation) =>
      reservation.vehicleId === vehicleId &&
      RESERVATION_BLOCKING_STATUSES.includes(reservation.status) &&
      reservationIntervalsOverlap(reservation)
    );
  }

  function vehicleIsBookable(vehicleId: string) {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return Boolean(vehicle && vehicle.status === "available" && !vehicleHasConflict(vehicleId));
  }

  function canContinue(step: BookingStep) {
    if (step === "dates") {
      return Boolean(
        newBooking.startDate &&
          newBooking.pickupTime &&
          newBooking.endDate &&
          newBooking.returnTime &&
          newBooking.pickupLocation &&
          newBooking.returnLocation &&
          !rentalDateError
      );
    }
    if (step === "vehicle") return Boolean(selectedVehicle && vehicleIsBookable(selectedVehicle.id));
    if (step === "customer") {
      return customerMode === "existing" ? Boolean(selectedCustomer) : customerFormIsValid();
    }
    return true;
  }

  async function handleConfirmBooking() {
    if (!selectedVehicle || !vehicleIsBookable(selectedVehicle.id) || rentalDateError || !canContinue("customer")) return;

    setSaving(true);
    try {
      const customer: Customer =
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer
          : await addCustomer({
              firstName: newCustomer.firstName.trim(),
              lastName: newCustomer.lastName.trim(),
              email: newCustomer.email.trim(),
              phone: newCustomer.phone.trim(),
              licenseNumber: newCustomer.licenseNumber.trim(),
              licenseExpiry: newCustomer.licenseExpiry,
              address: newCustomer.address.trim(),
              images: newCustomer.images,
              verified: true,
            });

      const reservation = await addReservation({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
        startDate: newBooking.startDate,
        pickupTime: newBooking.pickupTime,
        endDate: newBooking.endDate,
        returnTime: newBooking.returnTime,
        status: "confirmed",
        dailyRate: selectedVehicle.dailyRate,
        totalCost,
        extras: newBooking.extras,
        pickupLocation: newBooking.pickupLocation,
        returnLocation: newBooking.returnLocation,
        notes: "",
        images: newBooking.images,
      });

      setSelectedReservation(reservation);
      setShowNewBooking(false);
      setReservationsReloadKey((current) => current + 1);
      resetWizard();
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  }

  async function uploadImages(files: FileList | null, prefix: string) {
    if (!files?.length) return [];
    return uploadFiles(Array.from(files), prefix);
  }

  async function handleNewCustomerFiles(files: FileList | null) {
    const urls = normalizePhotoUrls(await uploadImages(files, "customers"));
    if (!urls.length) return;
    setNewCustomer((current) => ({ ...current, images: normalizePhotoUrls([...current.images, ...urls]) }));
  }

  async function handleNewReservationFiles(files: FileList | null) {
    const urls = normalizePhotoUrls(await uploadImages(files, "reservations"));
    if (!urls.length) return;
    setNewBooking((current) => ({ ...current, images: normalizePhotoUrls([...current.images, ...urls]) }));
  }

  async function handleCustomerDetailFiles(files: FileList | null) {
    if (!selectedReservationCustomer) return;
    const urls = normalizePhotoUrls(await uploadImages(files, "customers"));
    if (!urls.length) return;
    const customer = await updateCustomerImages(
      selectedReservationCustomer.id,
      normalizePhotoUrls([...selectedReservationCustomer.images, ...urls])
    );
    if (selectedReservation?.customerId === customer.id) {
      setSelectedReservation({ ...selectedReservation });
    }
  }

  async function handleReservationDetailFiles(files: FileList | null) {
    if (!selectedReservation) return;
    const urls = normalizePhotoUrls(await uploadImages(files, "reservations"));
    if (!urls.length) return;
    const reservation = await updateReservationImages(
      selectedReservation.id,
      normalizePhotoUrls([...selectedReservation.images, ...urls])
    );
    setSelectedReservation(reservation);
    setReservations((current) => current.map((item) => item.id === reservation.id ? reservation : item));
  }

  async function handleCancelReservation(reservation: Reservation) {
    if (!["pending", "confirmed"].includes(reservation.status)) return;

    setCancelling(true);
    try {
      const updatedReservation = await cancelReservation(reservation.id);
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setCancelling(false);
    }
  }

  const mobileDetail = showNewBooking || !!selectedReservation;

  return (
    <div className={mobileDetail ? "flex flex-col flex-1 min-h-0 lg:block lg:space-y-6" : "space-y-6"}>
      <div className={`flex items-center justify-between ${showNewBooking || selectedReservation ? "hidden lg:flex" : ""}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("res.title")}</h1>
          <p className="text-muted-foreground" suppressHydrationWarning>
            {reservationTotal} {t("res.total")} &middot;{" "}
            {reservations.length}/{reservationTotal}
          </p>
        </div>
        <Button onClick={openNewBooking}>
          <Plus className="mr-2 h-4 w-4" />
          {t("res.newBooking")}
        </Button>
      </div>

      <div className={`flex flex-wrap items-center gap-3 ${showNewBooking || selectedReservation ? "hidden lg:flex" : ""}`}>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("res.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full min-w-0 overflow-x-auto sm:w-auto">
          <div className="flex gap-1 rounded-lg border p-1 w-max">
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
        </div>
        <div className="flex-1 sm:flex-none sm:w-36">
          <EuropeanDateInput
            displayValue={filterDateInputs.startDate}
            isoValue={filterDates.startDate}
            placeholder={t("res.dateFrom")}
            ariaLabel={t("res.dateFrom")}
            onDisplayChange={(value) => setFilterEuropeanDateInput("startDate", value)}
            onIsoChange={(value) => setFilterIsoDateInput("startDate", value)}
          />
        </div>
        <div className="flex-1 sm:flex-none sm:w-36">
          <EuropeanDateInput
            displayValue={filterDateInputs.endDate}
            isoValue={filterDates.endDate}
            placeholder={t("res.dateTo")}
            ariaLabel={t("res.dateTo")}
            onDisplayChange={(value) => setFilterEuropeanDateInput("endDate", value)}
            onIsoChange={(value) => setFilterIsoDateInput("endDate", value)}
          />
        </div>
        <Button variant="outline" onClick={clearReservationFilters}>{t("common.clear")}</Button>
      </div>

      <div className={`grid gap-6 lg:grid-cols-5 ${mobileDetail ? "flex-1 min-h-0 lg:flex-none" : ""}`}>
        <div className={`lg:col-span-3 ${selectedReservation || showNewBooking ? "hidden lg:block" : ""}`}>
          <Card>
            <div className="divide-y">
              {reservations.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => { setSelectedReservation(reservation); setShowNewBooking(false); }}
                  className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedReservation?.id === reservation.id ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{reservation.customerName}</p>
                      <Badge className={statusColors[reservation.status]} variant="secondary">
                        {statusLabels[reservation.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reservation.vehicleName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatReservationPeriod(reservation)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">&euro;{reservation.totalCost}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.extras.length > 0
                        ? reservation.extras.map((extra) => extraLabels[extra] ?? extra).join(", ")
                        : t("common.none")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {reservations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">{t("res.noBookings")}</div>
              )}
            </div>
          </Card>
        </div>

        <div className={`lg:col-span-2 ${!selectedReservation && !showNewBooking ? "hidden lg:block" : "flex flex-col min-h-0 lg:block"}`}>
          {showNewBooking ? (
            <Card className="flex flex-col flex-1 min-h-0 lg:flex-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="lg:hidden" onClick={() => setShowNewBooking(false)}>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <CardTitle>{t("res.newBooking")}</CardTitle>
                </div>
                <button className="hidden lg:block" onClick={() => setShowNewBooking(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="flex items-center gap-1 mb-6">
                  {steps.map((step, i) => (
                    <div key={step.key} className="flex items-center gap-1">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          i <= currentStepIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i < currentStepIndex ? <Check className="h-3 w-3" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-0.5 w-4 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium mb-4">{steps[currentStepIndex].label}</p>

                {bookingStep === "dates" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{t("booking.pickupDate")}</label>
                        <EuropeanDateInput
                          displayValue={dateInputs.startDate}
                          isoValue={newBooking.startDate}
                          onDisplayChange={(value) => setEuropeanDateInput("startDate", value)}
                          onIsoChange={(value) => setIsoDateInput("startDate", value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{t("booking.pickupTime")}</label>
                        <Input
                          type="time"
                          value={newBooking.pickupTime}
                          onChange={(e) => setNewBooking({ ...newBooking, pickupTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">{t("booking.returnDate")}</label>
                        <EuropeanDateInput
                          displayValue={dateInputs.endDate}
                          isoValue={newBooking.endDate}
                          onDisplayChange={(value) => setEuropeanDateInput("endDate", value)}
                          onIsoChange={(value) => setIsoDateInput("endDate", value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">{t("booking.returnTime")}</label>
                        <Input
                          type="time"
                          value={newBooking.returnTime}
                          onChange={(e) => setNewBooking({ ...newBooking, returnTime: e.target.value })}
                        />
                      </div>
                    </div>
                    {rentalDateError && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {rentalDateError}
                      </p>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground">{t("booking.pickupLocation")}</label>
                      <div className="flex gap-2 mt-1">
                        {["Airport", "Downtown"].map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking({ ...newBooking, pickupLocation: loc })}
                            className={`flex-1 rounded-lg border p-2 text-sm ${
                              newBooking.pickupLocation === loc ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {locationLabels[loc] ?? loc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{t("booking.returnLocation")}</label>
                      <div className="flex gap-2 mt-1">
                        {["Airport", "Downtown"].map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking({ ...newBooking, returnLocation: loc })}
                            className={`flex-1 rounded-lg border p-2 text-sm ${
                              newBooking.returnLocation === loc ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {locationLabels[loc] ?? loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {bookingStep === "vehicle" && (() => {
                  const transmissions = [...new Set(vehicles.filter(v => v.status === "available").map(v => v.transmission))].sort();
                  const categories = [...new Set(vehicles.filter(v => v.status === "available").map(v => v.category))].sort();
                  const filteredVehicles = vehicles
                    .filter((v) => v.status === "available")
                    .filter((v) => !vehicleFilterAvailable || !vehicleHasConflict(v.id))
                    .filter((v) => !vehicleFilterTransmission || v.transmission === vehicleFilterTransmission)
                    .filter((v) => !vehicleFilterCategory || v.category === vehicleFilterCategory)
                    .filter((v) => {
                      const q = vehicleSearch.trim().toLowerCase();
                      return !q || `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(q);
                    });
                  return (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t("fleet.searchPlaceholder")}
                          className="pl-9"
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setVehicleFilterAvailable(!vehicleFilterAvailable)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${vehicleFilterAvailable ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                        >
                          {t("fleet.status.available")}
                        </button>
                        {transmissions.map((tr) => (
                          <button
                            key={tr}
                            onClick={() => setVehicleFilterTransmission(vehicleFilterTransmission === tr ? "" : tr)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${vehicleFilterTransmission === tr ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                          >
                            {getTransmissionLabel(tr)}
                          </button>
                        ))}
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setVehicleFilterCategory(vehicleFilterCategory === cat ? "" : cat)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${vehicleFilterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                          >
                            {t(`fleet.${cat}` as const)}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {filteredVehicles.length === 0 && (
                          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                            {t("fleet.noVehicles")}
                          </p>
                        )}
                        {filteredVehicles.map((v) => {
                          const hasConflict = vehicleHasConflict(v.id);
                          return (
                            <button
                              key={v.id}
                              disabled={hasConflict}
                              onClick={() => setNewBooking({ ...newBooking, vehicleId: v.id })}
                              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                newBooking.vehicleId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                              }`}
                            >
                              <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{v.make} {v.model}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {t(`fleet.${v.category}` as const)} &middot; {v.seats} {t("fleet.seats").toLowerCase()} &middot; {getTransmissionLabel(v.transmission)}
                                </p>
                                {hasConflict && (
                                  <p className="mt-1 text-xs text-destructive">{t("booking.vehicleUnavailableForPeriod")}</p>
                                )}
                              </div>
                              <p className="text-sm font-bold text-primary">&euro;{v.dailyRate}{t("common.perDay")}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {bookingStep === "customer" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={customers.length === 0}
                        onClick={() => setCustomerMode("existing")}
                        className={`rounded-lg border p-2 text-sm font-medium ${
                          customerMode === "existing" ? "border-primary bg-primary/5" : "hover:bg-muted"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {t("booking.existingCustomer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerMode("new")}
                        className={`rounded-lg border p-2 text-sm font-medium ${
                          customerMode === "new" ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        {t("booking.newCustomer")}
                      </button>
                    </div>

                    {customerMode === "existing" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={t("booking.searchCustomers")}
                            className="pl-9"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                        {customers.filter((c) => {
                          const q = customerSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
                            c.email.toLowerCase().includes(q) ||
                            c.phone?.toLowerCase().includes(q)
                          );
                        }).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setNewBooking({ ...newBooking, customerId: c.id })}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                              newBooking.customerId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                            }`}
                          >
                            <User className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                            {c.verified && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                {t("booking.verified")}
                              </Badge>
                            )}
                          </button>
                        ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-muted-foreground">{t("public.firstName")}</label>
                          <Input
                            value={newCustomer.firstName}
                            onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t("public.lastName")}</label>
                          <Input
                            value={newCustomer.lastName}
                            onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t("public.email")}</label>
                          <Input
                            type="email"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t("public.phone")}</label>
                          <Input
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t("public.licenseNumber")}</label>
                          <Input
                            value={newCustomer.licenseNumber}
                            onChange={(e) => setNewCustomer({ ...newCustomer, licenseNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t("booking.licenseExpiry")}</label>
                          <EuropeanDateInput
                            displayValue={dateInputs.licenseExpiry}
                            isoValue={newCustomer.licenseExpiry}
                            onDisplayChange={(value) => setEuropeanDateInput("licenseExpiry", value)}
                            onIsoChange={(value) => setIsoDateInput("licenseExpiry", value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">{t("booking.address")}</label>
                          <Input
                            value={newCustomer.address}
                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">{t("booking.customerPhotos")}</label>
                          <button
                            type="button"
                            onClick={() => newCustomerFileRef.current?.click()}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-muted"
                          >
                            <Upload className="h-4 w-4" />
                            {t("booking.addPhotos")}
                          </button>
                          <input
                            ref={newCustomerFileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => void handleNewCustomerFiles(e.target.files)}
                          />
                          {normalizePhotoUrls(newCustomer.images).length > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {normalizePhotoUrls(newCustomer.images).map((image, index) => (
                                <div
                                  key={image}
                                  className="relative aspect-video overflow-hidden rounded-md bg-muted"
                                >
                                  <Image
                                    src={image}
                                    alt={`${t("booking.customerPhotos")} ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {customerError && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {customerError}
                      </p>
                    )}
                  </div>
                )}

                {bookingStep === "extras" && (
                  <div className="space-y-2">
                    {EXTRAS.map((extra) => {
                      const Icon = extraIcons[extra] || Navigation;
                      const selected = newBooking.extras.includes(extra);
                      return (
                        <button
                          key={extra}
                          onClick={() =>
                            setNewBooking({
                              ...newBooking,
                              extras: selected
                                ? newBooking.extras.filter((e) => e !== extra)
                                : [...newBooking.extras, extra],
                            })
                          }
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium flex-1">{extraLabels[extra] ?? extra}</span>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {bookingStep === "summary" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("res.vehicle")}</span>
                        <span className="font-medium">
                          {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("res.customer")}</span>
                        <span className="font-medium">
                          {customerMode === "existing" && selectedCustomer
                            ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                            : getNewCustomerName() || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("booking.datesLocation")}</span>
                        <span className="font-medium text-right">
                          {newBooking.startDate && newBooking.endDate
                            ? formatDateTimeRange(newBooking.startDate, newBooking.pickupTime, newBooking.endDate, newBooking.returnTime)
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("booking.duration")}</span>
                        <span className="font-medium">{dayCount} {dayCount === 1 ? t("common.day") : t("common.days")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("booking.pickup")}</span>
                        <span className="font-medium">{locationLabels[newBooking.pickupLocation] ?? newBooking.pickupLocation}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("booking.return")}</span>
                        <span className="font-medium">{locationLabels[newBooking.returnLocation] ?? newBooking.returnLocation}</span>
                      </div>
                      {newBooking.extras.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("res.extras")}</span>
                          <span className="font-medium">{newBooking.extras.map((extra) => extraLabels[extra] ?? extra).join(", ")}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm font-bold">
                        <span>{t("common.total")}</span>
                        <span className="text-primary">&euro;{totalCost}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{t("booking.reservationPhotos")}</label>
                      <button
                        type="button"
                        onClick={() => newReservationFileRef.current?.click()}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-muted"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {t("booking.addPhotos")}
                      </button>
                      <input
                        ref={newReservationFileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleNewReservationFiles(e.target.files)}
                      />
                      {normalizePhotoUrls(newBooking.images).length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {normalizePhotoUrls(newBooking.images).map((image, index) => (
                            <div
                              key={image}
                              className="relative aspect-video overflow-hidden rounded-md bg-muted"
                            >
                              <Image
                                src={image}
                                alt={`${t("booking.reservationPhotos")} ${index + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button className="w-full" disabled={saving} onClick={handleConfirmBooking}>
                      {saving ? t("vehicleForm.saving") : t("booking.confirmBooking")}
                    </Button>
                  </div>
                )}

              </CardContent>
              {bookingStep !== "summary" && (
                <div className="shrink-0 border-t px-6 py-4 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentStepIndex === 0}
                    onClick={() => setBookingStep(steps[currentStepIndex - 1].key)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {t("common.back")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canContinue(bookingStep)}
                    onClick={() => setBookingStep(steps[currentStepIndex + 1].key)}
                  >
                    {t("common.next")}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ) : selectedReservation ? (
            <Card className="flex flex-col flex-1 min-h-0 lg:flex-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="lg:hidden" onClick={() => setSelectedReservation(null)}>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <CardTitle>{t("res.bookingDetails")}</CardTitle>
                </div>
                <button className="hidden lg:block" onClick={() => setSelectedReservation(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 overflow-y-auto min-h-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">#{selectedReservation.id}</p>
                  <Badge className={statusColors[selectedReservation.status]} variant="secondary">
                    {statusLabels[selectedReservation.status]}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{selectedReservation.customerName}</p>
                      <p className="text-xs text-muted-foreground">{t("res.customer")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{selectedReservation.vehicleName}</p>
                      <p className="text-xs text-muted-foreground">{t("res.vehicle")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatReservationPeriod(selectedReservation)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("res.rentalPeriod")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {locationLabels[selectedReservation.pickupLocation] ?? selectedReservation.pickupLocation} &rarr; {locationLabels[selectedReservation.returnLocation] ?? selectedReservation.returnLocation}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("res.locations")}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("res.extras")}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReservation.extras.length > 0 ? (
                      selectedReservation.extras.map((extra) => (
                        <Badge key={extra} variant="outline">
                          {extraLabels[extra] ?? extra}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("common.none")}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("res.dailyRate")}</span>
                    <span>&euro;{selectedReservation.dailyRate}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-1">
                    <span>{t("common.total")}</span>
                    <span className="text-primary">&euro;{selectedReservation.totalCost}</span>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("res.notes")}</p>
                      <p className="text-sm">{selectedReservation.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{t("booking.customerPhotos")}</p>
                    {selectedReservationCustomer && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => customerDetailFileRef.current?.click()}
                        >
                          <ImagePlus className="mr-1 h-3.5 w-3.5" />
                          {t("booking.addPhotos")}
                        </Button>
                        <input
                          ref={customerDetailFileRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => void handleCustomerDetailFiles(e.target.files)}
                        />
                      </>
                    )}
                  </div>
                  {selectedReservationCustomer && normalizePhotoUrls(selectedReservationCustomer.images).length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {normalizePhotoUrls(selectedReservationCustomer.images).map((image, index) => (
                        <div
                          key={image}
                          className="relative aspect-video overflow-hidden rounded-md bg-muted"
                        >
                          <Image
                            src={image}
                            alt={`${t("booking.customerPhotos")} ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("booking.noPhotos")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{t("booking.reservationPhotos")}</p>
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reservationDetailFileRef.current?.click()}
                      >
                        <ImagePlus className="mr-1 h-3.5 w-3.5" />
                        {t("booking.addPhotos")}
                      </Button>
                      <input
                        ref={reservationDetailFileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleReservationDetailFiles(e.target.files)}
                      />
                    </>
                  </div>
                  {normalizePhotoUrls(selectedReservation.images).length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {normalizePhotoUrls(selectedReservation.images).map((image, index) => (
                        <div
                          key={image}
                          className="relative aspect-video overflow-hidden rounded-md bg-muted"
                        >
                          <Image
                            src={image}
                            alt={`${t("booking.reservationPhotos")} ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("booking.noPhotos")}</p>
                  )}
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground">
                  {t("res.created")}: {formatDate(selectedReservation.createdAt)}
                </p>

                {["pending", "confirmed"].includes(selectedReservation.status) && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={cancelling}
                      onClick={() => handleCancelReservation(selectedReservation)}
                    >
                      {cancelling ? t("res.cancelling") : t("res.cancelReservation")}
                    </Button>
                  </>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("booking.contractLanguage")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`/api/reservations/${encodeURIComponent(selectedReservation.id)}/contract?lang=sr`}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <FileText className="h-4 w-4" />
                      {t("booking.downloadContractSr")}
                    </a>
                    <a
                      href={`/api/reservations/${encodeURIComponent(selectedReservation.id)}/contract?lang=en`}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                      {t("booking.downloadContractEn")}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("res.selectBooking")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
