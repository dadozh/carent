"use client";

import { useEffect, useRef, useState } from "react";
import {
  statusColors,
  type Customer,
  type FuelLevel,
  type Reservation,
  type ReservationStatus,
  type SwapReasonType,
} from "@/lib/mock-data";
import {
  RESERVATION_BLOCKING_STATUSES,
  reservationBlocksPeriod,
} from "@/lib/reservation-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CalendarPlus,
  User,
  Car,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle,
  Fuel,
  Navigation,
  Wifi,
  Baby,
  FileText,
  ImagePlus,
  Upload,
  Wrench,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useVehicles } from "@/lib/use-vehicles";
import { useReservations } from "@/lib/use-reservations";
import { useTenantSettings } from "@/lib/use-tenant-settings";
import { useCan } from "@/lib/role-context";
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
  pickupLocation: "",
  returnLocation: "",
  vehicleId: "",
  customerId: "",
  dailyRateOverride: "",
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
  const { settings: tenantSettings } = useTenantSettings();
  const {
    customers,
    addCustomer,
    addReservation,
    cancelReservation,
    updateCustomerImages,
    updateReservationImages,
    swapVehicle,
    extendReservation,
    completeReturn,
    markAsPaid,
  } = useReservations({ loadReservations: false });
  const canWrite = useCan("writeReservation");
  const canCancel = useCan("cancelReservation");
  const canSwap = useCan("swapVehicle");
  const canExtend = useCan("extendReservation");
  const canCompleteReturn = useCan("completeReturn");
  const canMarkAsPaid = useCan("markAsPaid");
  const newCustomerFileRef = useRef<HTMLInputElement>(null);
  const newReservationFileRef = useRef<HTMLInputElement>(null);
  const customerDetailFileRef = useRef<HTMLInputElement>(null);
  const reservationDetailFileRef = useRef<HTMLInputElement>(null);
  const returnPhotosFileRef = useRef<HTMLInputElement>(null);
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
  const [confirmCancelReservation, setConfirmCancelReservation] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelAdjustedCost, setCancelAdjustedCost] = useState("");
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapReason, setSwapReason] = useState("");
  const [swapReasonType, setSwapReasonType] = useState<SwapReasonType>("breakdown");
  const [swapOldCondition, setSwapOldCondition] = useState("");
  const [swapVehicleId, setSwapVehicleId] = useState("");
  const [swapVehicleSearch, setSwapVehicleSearch] = useState("");
  const [swapFilterAvailable, setSwapFilterAvailable] = useState(false);
  const [swapFilterTransmission, setSwapFilterTransmission] = useState("");
  const [swapFilterCategory, setSwapFilterCategory] = useState("");
  const [swapping, setSwapping] = useState(false);
  // Rental extension
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendDateInput, setExtendDateInput] = useState("");
  const [extendIsoDate, setExtendIsoDate] = useState("");
  const [extendReturnTime, setExtendReturnTime] = useState("10:00");
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");
  // Return checklist
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnMileage, setReturnMileage] = useState("");
  const [returnFuelLevel, setReturnFuelLevel] = useState<FuelLevel>("full");
  const [returnHasDamage, setReturnHasDamage] = useState(false);
  const [returnDamageDescription, setReturnDamageDescription] = useState("");
  const [returnExtraCharges, setReturnExtraCharges] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [uploadingReturnPhotos, setUploadingReturnPhotos] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [paying, setPaying] = useState(false);
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
  const parsedDailyRateOverride = Number(newBooking.dailyRateOverride);
  const effectiveDailyRate = selectedVehicle
    ? Number.isFinite(parsedDailyRateOverride) && parsedDailyRateOverride > 0
      ? parsedDailyRateOverride
      : selectedVehicle.dailyRate
    : 0;
  const totalCost = effectiveDailyRate * dayCount;
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
  const bookingLocations = tenantSettings.locations;
  const extraOptions = tenantSettings.extras;

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
    if (bookingLocations.length === 0) return;
    setNewBooking((current) => {
      const pickupLocation = current.pickupLocation || bookingLocations[0];
      const returnLocation = current.returnLocation || bookingLocations[0];
      if (pickupLocation === current.pickupLocation && returnLocation === current.returnLocation) {
        return current;
      }
      return { ...current, pickupLocation, returnLocation };
    });
  }, [bookingLocations]);

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
        dailyRate: effectiveDailyRate,
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
    const isActive = reservation.status === "active";
    setCancelling(true);
    try {
      const extra = isActive
        ? {
            cancellationReason: cancelReason || undefined,
            adjustedCost: cancelAdjustedCost !== "" ? Number(cancelAdjustedCost) : undefined,
          }
        : undefined;
      const updatedReservation = await cancelReservation(reservation.id, extra);
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setCancelling(false);
    }
  }

  async function handleSwapVehicle() {
    if (!selectedReservation || !swapVehicleId || !swapReason.trim()) return;
    const vehicle = vehicles.find((v) => v.id === swapVehicleId);
    if (!vehicle) return;
    setSwapping(true);
    try {
      const updatedReservation = await swapVehicle(selectedReservation.id, {
        toVehicleId: vehicle.id,
        toVehicleName: `${vehicle.make} ${vehicle.model}`,
        toVehiclePlate: vehicle.plate,
        reason: swapReason.trim(),
        reasonType: swapReasonType,
        fromVehicleCondition: swapOldCondition.trim() || undefined,
      });
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
      setShowSwapDialog(false);
      setSwapReason("");
      setSwapOldCondition("");
      setSwapVehicleId("");
    } catch (error) {
      console.error(error);
    } finally {
      setSwapping(false);
    }
  }

  async function handleExtendReservation() {
    if (!selectedReservation || !extendIsoDate) return;
    setExtendError("");
    setExtending(true);
    try {
      const updatedReservation = await extendReservation(selectedReservation.id, {
        newEndDate: extendIsoDate,
        newReturnTime: extendReturnTime,
      });
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
      setShowExtendDialog(false);
      setExtendDateInput("");
      setExtendIsoDate("");
    } catch (error) {
      setExtendError(error instanceof Error ? error.message : t("res.extensionConflict"));
    } finally {
      setExtending(false);
    }
  }

  async function handleReturnPhotoFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadingReturnPhotos(true);
    try {
      const urls = normalizePhotoUrls(await uploadImages(files, "returns"));
      if (urls.length) setReturnPhotos((prev) => normalizePhotoUrls([...prev, ...urls]));
    } finally {
      setUploadingReturnPhotos(false);
      if (returnPhotosFileRef.current) returnPhotosFileRef.current.value = "";
    }
  }

  async function handleCompleteReturn() {
    if (!selectedReservation || !returnMileage) return;
    setCompleting(true);
    try {
      const updatedReservation = await completeReturn(selectedReservation.id, {
        returnMileage: Number(returnMileage),
        fuelLevel: returnFuelLevel,
        hasDamage: returnHasDamage,
        damageDescription: returnHasDamage ? returnDamageDescription.trim() || undefined : undefined,
        extraCharges: returnExtraCharges !== "" ? Number(returnExtraCharges) : undefined,
        notes: returnNotes.trim() || undefined,
        returnPhotos: returnPhotos.length ? returnPhotos : undefined,
      });
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
      setShowReturnDialog(false);
    } catch (error) {
      console.error(error);
    } finally {
      setCompleting(false);
    }
  }

  async function handleMarkAsPaid() {
    if (!selectedReservation) return;
    setPaying(true);
    try {
      const updatedReservation = await markAsPaid(selectedReservation.id);
      setSelectedReservation(updatedReservation);
      setReservationsReloadKey((current) => current + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setPaying(false);
    }
  }

  const mobileDetail = showNewBooking || !!selectedReservation;

  return (
    <div className={mobileDetail ? "flex flex-col flex-1 min-h-0 -mx-4 -mt-4 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0 lg:block lg:space-y-6" : "space-y-6"}>
      <div className={`flex items-center justify-between ${showNewBooking || selectedReservation ? "hidden lg:flex" : ""}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("res.title")}</h1>
          <p className="text-muted-foreground" suppressHydrationWarning>
            {reservationTotal} {t("res.total")} &middot;{" "}
            {reservations.length}/{reservationTotal}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openNewBooking}>
            <Plus className="mr-2 h-4 w-4" />
            {t("res.newBooking")}
          </Button>
        )}
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
                    <div className="flex items-center justify-end gap-1.5">
                      <p className="text-sm font-bold">&euro;{reservation.totalCost}</p>
                      {reservation.payment && (
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      )}
                    </div>
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
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-none border-x-0 border-t-0 lg:flex-none lg:rounded-lg lg:border">
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
                          onChange={(e) => setNewBooking((current) => ({ ...current, pickupTime: e.target.value }))}
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
                          onChange={(e) => setNewBooking((current) => ({ ...current, returnTime: e.target.value }))}
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
                        {bookingLocations.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking((current) => ({ ...current, pickupLocation: loc }))}
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
                        {bookingLocations.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking((current) => ({ ...current, returnLocation: loc }))}
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
                              onClick={() => setNewBooking((current) => ({
                                ...current,
                                vehicleId: v.id,
                                dailyRateOverride: "",
                              }))}
                              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                newBooking.vehicleId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                              }`}
                            >
                              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{v.make} {v.model}</p>
                                <p className="text-xs text-muted-foreground truncate capitalize">
                                  {t(`fleet.${v.category}` as const)} &middot; {v.seats} {t("fleet.seats").toLowerCase()} &middot; {getTransmissionLabel(v.transmission)}
                                </p>
                                {hasConflict && (
                                  <p className="text-xs text-destructive">{t("booking.vehicleUnavailableForPeriod")}</p>
                                )}
                              </div>
                              <p className="text-sm font-bold text-primary shrink-0">&euro;{v.dailyRate}{t("common.perDay")}</p>
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
                            onClick={() => setNewBooking((current) => ({ ...current, customerId: c.id }))}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                              newBooking.customerId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                            }`}
                          >
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
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
                    {extraOptions.map((extra) => {
                      const Icon = extraIcons[extra] || Navigation;
                      const selected = newBooking.extras.includes(extra);
                      return (
                        <button
                          key={extra}
                          onClick={() =>
                            setNewBooking((current) => ({
                              ...current,
                              extras: selected
                                ? current.extras.filter((e) => e !== extra)
                                : [...current.extras, extra],
                            }))
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
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("res.dailyRate")}</label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={newBooking.dailyRateOverride}
                          onChange={(e) => setNewBooking((current) => ({ ...current, dailyRateOverride: e.target.value }))}
                          placeholder={selectedVehicle ? String(selectedVehicle.dailyRate) : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {newBooking.dailyRateOverride.trim()
                            ? t("booking.customRateHelp")
                            : t("booking.defaultRateHelp")}
                        </p>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("res.dailyRate")}</span>
                        <span className="font-medium">&euro;{effectiveDailyRate}</span>
                      </div>
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
              <div className="shrink-0 border-t px-6 pt-4 pb-20 lg:pb-4 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStepIndex === 0}
                  onClick={() => setBookingStep(steps[currentStepIndex - 1].key)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("common.back")}
                </Button>
                {bookingStep !== "summary" && (
                  <Button
                    size="sm"
                    disabled={!canContinue(bookingStep)}
                    onClick={() => setBookingStep(steps[currentStepIndex + 1].key)}
                  >
                    {t("common.next")}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ) : selectedReservation ? (
            <Card className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-none border-x-0 border-t-0 lg:flex-none lg:rounded-lg lg:border">
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

                {selectedReservation.status !== "cancelled" && !selectedReservation.payment && canMarkAsPaid && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={paying}
                      onClick={handleMarkAsPaid}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {paying ? t("res.markingAsPaid") : t("res.markAsPaid")}
                    </Button>
                  </>
                )}

                {["pending", "confirmed", "active"].includes(selectedReservation.status) && (canCancel || canSwap || canExtend || canCompleteReturn) && (
                  <>
                    <Separator />
                    {selectedReservation.status === "active" && canCompleteReturn && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          setReturnMileage("");
                          setReturnFuelLevel("full");
                          setReturnHasDamage(false);
                          setReturnDamageDescription("");
                          setReturnExtraCharges("");
                          setReturnNotes("");
                          setReturnPhotos([]);
                          setShowReturnDialog(true);
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("res.completeReturn")}
                      </Button>
                    )}
                    {selectedReservation.status === "active" && canExtend && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setExtendDateInput("");
                          setExtendIsoDate("");
                          setExtendReturnTime(selectedReservation.returnTime ?? "10:00");
                          setExtendError("");
                          setShowExtendDialog(true);
                        }}
                      >
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        {t("res.extendRental")}
                      </Button>
                    )}
                    {selectedReservation.status === "active" && canSwap && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSwapReason("");
                          setSwapReasonType("breakdown");
                          setSwapOldCondition("");
                          setSwapVehicleId("");
                          setSwapVehicleSearch("");
                          setSwapFilterAvailable(false);
                          setSwapFilterTransmission("");
                          setSwapFilterCategory("");
                          setShowSwapDialog(true);
                        }}
                      >
                        <Car className="mr-2 h-4 w-4" />
                        {t("res.swapVehicle")}
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={cancelling}
                        onClick={() => {
                          setCancelReason("");
                          setCancelAdjustedCost(String(selectedReservation.totalCost));
                          setConfirmCancelReservation(selectedReservation);
                        }}
                      >
                        {cancelling ? t("res.cancelling") : t("res.cancelReservation")}
                      </Button>
                    )}
                  </>
                )}

                {selectedReservation.cancellationReason && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{t("res.cancellationReasonLabel")}</p>
                      <p className="text-sm">{selectedReservation.cancellationReason}</p>
                    </div>
                  </>
                )}

                {selectedReservation.extensions && selectedReservation.extensions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("res.extensionHistory")}</p>
                      {selectedReservation.extensions.map((ext, i) => (
                        <div key={i} className="rounded-lg border p-3 text-xs space-y-1">
                          <p className="text-muted-foreground">{t("res.extendedOn")}: {formatDate(ext.extendedAt.slice(0, 10))}</p>
                          <p>{formatDate(ext.previousEndDate)} → {formatDate(ext.newEndDate)}</p>
                          <p className="font-medium">+€{ext.additionalCost}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedReservation.vehicleSwaps && selectedReservation.vehicleSwaps.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("res.vehicleHistory")}</p>
                      {selectedReservation.vehicleSwaps.map((swap, i) => (
                        <div key={i} className="rounded-lg border p-3 text-xs space-y-1">
                          <p className="text-muted-foreground">{formatDate(swap.swappedAt.slice(0, 10))}</p>
                          <p><span className="text-muted-foreground">{t("res.originalVehicle")}:</span> {swap.fromVehicleName} · {swap.fromVehiclePlate}</p>
                          <p><span className="text-muted-foreground">{t("res.replacedWith")}:</span> {swap.toVehicleName} · {swap.toVehiclePlate}</p>
                          <p className="text-muted-foreground italic">{swap.reason}</p>
                          {swap.fromVehicleCondition && (
                            <p className="text-muted-foreground italic">{swap.fromVehicleCondition}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedReservation.returnChecklist && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("res.returnChecklistSection")}</p>
                      <div className="rounded-lg border p-3 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("res.returnedAt")}</span>
                          <span>{formatDate(selectedReservation.returnChecklist.completedAt.slice(0, 10))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("res.returnedMileage")}</span>
                          <span>{selectedReservation.returnChecklist.returnMileage.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("res.fuelLevel")}</span>
                          <span className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            {t(`res.fuel${selectedReservation.returnChecklist.fuelLevel.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}` as Parameters<typeof t>[0])}
                          </span>
                        </div>
                        {selectedReservation.returnChecklist.hasDamage && (
                          <div className="pt-1 border-t border-destructive/20">
                            <p className="text-destructive font-medium flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {t("res.damageDescription")}
                            </p>
                            {selectedReservation.returnChecklist.damageDescription && (
                              <p className="text-muted-foreground mt-0.5">{selectedReservation.returnChecklist.damageDescription}</p>
                            )}
                          </div>
                        )}
                        {!!selectedReservation.returnChecklist.extraCharges && selectedReservation.returnChecklist.extraCharges > 0 && (
                          <div className="flex justify-between font-medium">
                            <span className="text-muted-foreground">{t("res.extraCharges")}</span>
                            <span className="text-destructive">+€{selectedReservation.returnChecklist.extraCharges}</span>
                          </div>
                        )}
                        {selectedReservation.returnChecklist.notes && (
                          <p className="text-muted-foreground italic pt-1">{selectedReservation.returnChecklist.notes}</p>
                        )}
                      </div>
                      {selectedReservation.returnChecklist.returnPhotos && selectedReservation.returnChecklist.returnPhotos.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {selectedReservation.returnChecklist.returnPhotos.map((url, i) => (
                            <div key={url} className="relative aspect-video overflow-hidden rounded-md bg-muted">
                              <Image src={url} alt={`${t("res.returnPhotos")} ${i + 1}`} fill className="object-cover" unoptimized />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t("res.payment")}</p>
                  {selectedReservation.payment ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <Check className="mr-1 h-3 w-3" />
                        {t("res.paid")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("res.paymentMethodCash")} · {formatDate(selectedReservation.payment.paidAt.slice(0, 10))}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("res.unpaid")}
                    </Badge>
                  )}
                </div>

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

      <Dialog
        open={!!confirmCancelReservation}
        onOpenChange={(open) => { if (!open) setConfirmCancelReservation(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("res.cancelConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {confirmCancelReservation?.status === "active"
                ? t("res.cancelConfirmActiveDesc")
                : t("res.cancelConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          {confirmCancelReservation?.status === "active" && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("res.cancellationReason")}</label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("res.cancellationReasonPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_return">{t("res.reasonEarlyReturn")}</SelectItem>
                    <SelectItem value="breakdown">{t("res.reasonBreakdown")}</SelectItem>
                    <SelectItem value="accident">{t("res.reasonAccident")}</SelectItem>
                    <SelectItem value="no_show">{t("res.reasonNoShow")}</SelectItem>
                    <SelectItem value="other">{t("res.reasonOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("res.adjustedCost")}</label>
                <Input
                  type="number"
                  min="0"
                  value={cancelAdjustedCost}
                  onChange={(e) => setCancelAdjustedCost(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmCancelReservation(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={async () => {
                if (!confirmCancelReservation) return;
                await handleCancelReservation(confirmCancelReservation);
                setConfirmCancelReservation(null);
              }}
            >
              {cancelling ? t("res.cancelling") : t("res.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={(open) => { if (!open) setShowReturnDialog(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("res.completeReturnTitle")}</DialogTitle>
            <DialogDescription>{t("res.completeReturnDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.returnMileage")}</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 45000"
                value={returnMileage}
                onChange={(e) => setReturnMileage(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.fuelLevel")}</label>
              <div className="grid grid-cols-5 gap-1">
                {(["empty", "quarter", "half", "three_quarter", "full"] as FuelLevel[]).map((level) => {
                  const labelKey = `res.fuel${level.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}` as Parameters<typeof t>[0];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setReturnFuelLevel(level)}
                      className={`rounded-md border py-2 text-xs text-center font-medium transition-colors ${
                        returnFuelLevel === level
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="return-has-damage"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={returnHasDamage}
                onChange={(e) => setReturnHasDamage(e.target.checked)}
              />
              <label htmlFor="return-has-damage" className="text-sm font-medium cursor-pointer">
                {t("res.hasDamage")}
              </label>
            </div>
            {returnHasDamage && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("res.damageDescription")}</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("res.damageDescriptionPlaceholder")}
                  value={returnDamageDescription}
                  onChange={(e) => setReturnDamageDescription(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.extraCharges")}</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={returnExtraCharges}
                onChange={(e) => setReturnExtraCharges(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.returnNotes")}</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t("res.returnNotesPlaceholder")}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.returnPhotos")}</label>
              <button
                type="button"
                disabled={uploadingReturnPhotos}
                onClick={() => returnPhotosFileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                {uploadingReturnPhotos ? t("common.loading") : t("res.addReturnPhotos")}
              </button>
              <input
                ref={returnPhotosFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleReturnPhotoFiles(e.target.files)}
              />
              {returnPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {returnPhotos.map((url, i) => (
                    <div key={url} className="group relative aspect-video overflow-hidden rounded-md bg-muted">
                      <Image src={url} alt={`${t("res.returnPhotos")} ${i + 1}`} fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => setReturnPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!returnMileage || completing}
              onClick={handleCompleteReturn}
            >
              {completing ? t("res.completing") : t("res.confirmReturn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtendDialog} onOpenChange={(open) => { if (!open) setShowExtendDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("res.extendRentalTitle")}</DialogTitle>
            <DialogDescription>{t("res.extendRentalDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.newReturnDate")}</label>
              <EuropeanDateInput
                displayValue={extendDateInput}
                isoValue={extendIsoDate}
                placeholder="dd.MM.yyyy"
                ariaLabel={t("res.newReturnDate")}
                onDisplayChange={(v) => {
                  const next = normalizeEuropeanDateInput(v);
                  setExtendDateInput(next);
                  setExtendIsoDate(parseEuropeanDate(next));
                }}
                onIsoChange={(v) => {
                  setExtendDateInput(isoDateToEuropeanInput(v));
                  setExtendIsoDate(v);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.newReturnTime")}</label>
              <Input
                type="time"
                value={extendReturnTime}
                onChange={(e) => setExtendReturnTime(e.target.value)}
              />
            </div>
            {selectedReservation && extendIsoDate && (
              (() => {
                const currentEnd = new Date(`${selectedReservation.endDate}T${selectedReservation.returnTime}`);
                const newEnd = new Date(`${extendIsoDate}T${extendReturnTime}`);
                const diffMs = newEnd.getTime() - currentEnd.getTime();
                const extraDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
                const extraCost = extraDays * selectedReservation.dailyRate;
                return extraDays > 0 ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("res.extensionAdditionalCost")}</span>
                      <span className="font-bold text-primary">+€{extraCost}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">{t("common.total")}</span>
                      <span className="font-bold">€{selectedReservation.totalCost + extraCost}</span>
                    </div>
                  </div>
                ) : null;
              })()
            )}
            {extendError && (
              <p className="text-sm text-destructive">{extendError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!extendIsoDate || extending}
              onClick={handleExtendReservation}
            >
              {extending ? t("res.extending") : t("res.extendConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSwapDialog} onOpenChange={(open) => { if (!open) setShowSwapDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("res.swapVehicleTitle")}</DialogTitle>
            <DialogDescription>{t("res.swapVehicleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.swapReasonType")}</label>
              <Select value={swapReasonType} onValueChange={(v) => setSwapReasonType(v as SwapReasonType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakdown">{t("res.swapReasonBreakdown")}</SelectItem>
                  <SelectItem value="accident">{t("res.swapReasonAccident")}</SelectItem>
                  <SelectItem value="customer_request">{t("res.swapReasonCustomerRequest")}</SelectItem>
                  <SelectItem value="other">{t("res.swapReasonOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("res.swapReason")}</label>
              <Input
                placeholder={t("res.swapReasonPlaceholder")}
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
              />
            </div>
            {(swapReasonType === "breakdown" || swapReasonType === "accident") && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("res.swapOldVehicleCondition")}</label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("res.swapOldVehicleConditionPlaceholder")}
                  value={swapOldCondition}
                  onChange={(e) => setSwapOldCondition(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("res.swapVehicleLabel")}</label>
              {(() => {
                const swapCandidates = vehicles.filter((v) => v.status === "available" && v.id !== selectedReservation?.vehicleId);
                const swapTransmissions = [...new Set(swapCandidates.map((v) => v.transmission))].sort();
                const swapCategories = [...new Set(swapCandidates.map((v) => v.category))].sort();
                const filtered = swapCandidates
                  .filter((v) => !swapFilterAvailable || !vehicleHasConflict(v.id))
                  .filter((v) => !swapFilterTransmission || v.transmission === swapFilterTransmission)
                  .filter((v) => !swapFilterCategory || v.category === swapFilterCategory)
                  .filter((v) => {
                    const q = swapVehicleSearch.trim().toLowerCase();
                    return !q || `${v.make} ${v.model} ${v.year}`.toLowerCase().includes(q);
                  });
                return (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("fleet.searchPlaceholder")}
                        className="pl-9"
                        value={swapVehicleSearch}
                        onChange={(e) => setSwapVehicleSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSwapFilterAvailable(!swapFilterAvailable)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${swapFilterAvailable ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                      >
                        {t("fleet.status.available")}
                      </button>
                      {swapTransmissions.map((tr) => (
                        <button
                          key={tr}
                          onClick={() => setSwapFilterTransmission(swapFilterTransmission === tr ? "" : tr)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${swapFilterTransmission === tr ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                        >
                          {getTransmissionLabel(tr)}
                        </button>
                      ))}
                      {swapCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSwapFilterCategory(swapFilterCategory === cat ? "" : cat)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${swapFilterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                        >
                          {t(`fleet.${cat}` as const)}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1.5">
                      {filtered.length === 0 && (
                        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                          {t("fleet.noVehicles")}
                        </p>
                      )}
                      {filtered.map((v) => {
                        const hasConflict = vehicleHasConflict(v.id);
                        return (
                          <button
                            key={v.id}
                            onClick={() => setSwapVehicleId(v.id)}
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                              swapVehicleId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                            }`}
                          >
                            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.make} {v.model}</p>
                              <p className="text-xs text-muted-foreground truncate capitalize">
                                {t(`fleet.${v.category}` as const)} &middot; {v.seats} {t("fleet.seats").toLowerCase()} &middot; {getTransmissionLabel(v.transmission)}
                                {hasConflict && <span className="text-destructive ml-1">· {t("booking.vehicleUnavailableForPeriod")}</span>}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-primary shrink-0">&euro;{v.dailyRate}{t("common.perDay")}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!swapVehicleId || !swapReason.trim() || swapping}
              onClick={handleSwapVehicle}
            >
              {swapping ? t("vehicleForm.saving") : t("res.swapConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
