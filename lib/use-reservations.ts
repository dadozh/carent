"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Customer, Reservation } from "@/lib/mock-data";

export type CustomerInput = Omit<Customer, "id" | "verified" | "totalRentals" | "totalSpent" | "images"> & {
  verified?: boolean;
  images?: string[];
};

export type ReservationInput = Omit<Reservation, "id" | "createdAt" | "vehiclePlate" | "images"> & {
  createdAt?: string;
  vehiclePlate?: string;
  images?: string[];
};

const RESERVATIONS_CHANGE_EVENT = "carent-reservations-change";
const CUSTOMERS_CHANGE_EVENT = "carent-customers-change";
const EMPTY_RESERVATIONS: Reservation[] = [];
const EMPTY_CUSTOMERS: Customer[] = [];

let reservationsSnapshot: Reservation[] = EMPTY_RESERVATIONS;
let customersSnapshot: Customer[] = EMPTY_CUSTOMERS;
let reservationsLoadingPromise: Promise<void> | null = null;
let customersLoadingPromise: Promise<void> | null = null;
let reservationsLoaded = false;
let customersLoaded = false;

function emitReservationsChange() {
  window.dispatchEvent(new Event(RESERVATIONS_CHANGE_EVENT));
}

function emitCustomersChange() {
  window.dispatchEvent(new Event(CUSTOMERS_CHANGE_EVENT));
}

function getReservationsSnapshot(): Reservation[] {
  return reservationsSnapshot;
}

function getCustomersSnapshot(): Customer[] {
  return customersSnapshot;
}

async function refreshReservations() {
  if (reservationsLoadingPromise) return reservationsLoadingPromise;

  reservationsLoadingPromise = fetch("/api/reservations", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load reservations: ${response.status}`);
      }

      const data = await response.json() as { reservations?: Reservation[] };
      reservationsSnapshot = data.reservations ?? EMPTY_RESERVATIONS;
      reservationsLoaded = true;
      emitReservationsChange();
    })
    .catch((error) => {
      console.error(error);
      reservationsLoaded = true;
      emitReservationsChange();
    })
    .finally(() => {
      reservationsLoadingPromise = null;
    });

  return reservationsLoadingPromise;
}

async function refreshCustomers() {
  if (customersLoadingPromise) return customersLoadingPromise;

  customersLoadingPromise = fetch("/api/customers", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load customers: ${response.status}`);
      }

      const data = await response.json() as { customers?: Customer[] };
      customersSnapshot = data.customers ?? EMPTY_CUSTOMERS;
      customersLoaded = true;
      emitCustomersChange();
    })
    .catch((error) => {
      console.error(error);
      customersLoaded = true;
      emitCustomersChange();
    })
    .finally(() => {
      customersLoadingPromise = null;
    });

  return customersLoadingPromise;
}

function subscribeToReservations(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(RESERVATIONS_CHANGE_EVENT, onStoreChange);
  void refreshReservations();

  return () => {
    window.removeEventListener(RESERVATIONS_CHANGE_EVENT, onStoreChange);
  };
}

function subscribeToCustomers(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(CUSTOMERS_CHANGE_EVENT, onStoreChange);
  void refreshCustomers();

  return () => {
    window.removeEventListener(CUSTOMERS_CHANGE_EVENT, onStoreChange);
  };
}

async function postCustomer(input: CustomerInput): Promise<Customer> {
  const response = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create customer: ${response.status}`);
  }

  const data = await response.json() as { customer: Customer };
  customersSnapshot = [data.customer, ...customersSnapshot.filter((customer) => customer.id !== data.customer.id)];
  emitCustomersChange();
  return data.customer;
}

async function postReservation(input: ReservationInput): Promise<Reservation> {
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create reservation: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = [
    data.reservation,
    ...reservationsSnapshot.filter((reservation) => reservation.id !== data.reservation.id),
  ];
  emitReservationsChange();
  void refreshCustomers();
  return data.reservation;
}

async function patchReservationStatus(id: string, status: Reservation["status"], extra?: { cancellationReason?: string; adjustedCost?: number }): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extra }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update reservation: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchVehicleSwap(id: string, vehicleSwap: { toVehicleId: string; toVehicleName: string; toVehiclePlate: string; reason: string; reasonType: string; fromVehicleCondition?: string }): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleSwap }),
  });

  if (!response.ok) {
    throw new Error(`Failed to swap vehicle: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchExtendReservation(id: string, extension: { newEndDate: string; newReturnTime: string }): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extension }),
  });

  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error ?? `Failed to extend reservation: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchCompleteReturn(id: string, returnChecklist: {
  returnMileage: number;
  fuelLevel: string;
  hasDamage: boolean;
  damageDescription?: string;
  extraCharges?: number;
  notes?: string;
  returnPhotos?: string[];
}): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnChecklist }),
  });

  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error ?? `Failed to complete return: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchMarkAsPaid(id: string): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment: { method: "cash" } }),
  });

  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error ?? `Failed to mark reservation as paid: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchReservationImages(id: string, images: string[]): Promise<Reservation> {
  const response = await fetch(`/api/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update reservation images: ${response.status}`);
  }

  const data = await response.json() as { reservation: Reservation };
  reservationsSnapshot = reservationsSnapshot.map((reservation) =>
    reservation.id === data.reservation.id ? data.reservation : reservation
  );
  emitReservationsChange();
  return data.reservation;
}

async function patchCustomerImages(id: string, images: string[]): Promise<Customer> {
  const response = await fetch("/api/customers", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, images }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update customer images: ${response.status}`);
  }

  const data = await response.json() as { customer: Customer };
  customersSnapshot = customersSnapshot.map((customer) =>
    customer.id === data.customer.id ? data.customer : customer
  );
  emitCustomersChange();
  return data.customer;
}

interface UseReservationsOptions {
  loadReservations?: boolean;
}

export function useReservations({ loadReservations = true }: UseReservationsOptions = {}) {
  const subscribeReservations = useCallback((onStoreChange: () => void) => {
    if (!loadReservations) return () => {};
    return subscribeToReservations(onStoreChange);
  }, [loadReservations]);
  const reservationsStore = useSyncExternalStore(
    subscribeReservations,
    getReservationsSnapshot,
    () => EMPTY_RESERVATIONS
  );
  const customers = useSyncExternalStore(
    subscribeToCustomers,
    getCustomersSnapshot,
    () => EMPTY_CUSTOMERS
  );

  const addCustomer = useCallback((data: CustomerInput) => postCustomer(data), []);
  const addReservation = useCallback((data: ReservationInput) => postReservation(data), []);
  const cancelReservation = useCallback((id: string, extra?: { cancellationReason?: string; adjustedCost?: number }) => patchReservationStatus(id, "cancelled", extra), []);
  const swapVehicle = useCallback((id: string, swap: { toVehicleId: string; toVehicleName: string; toVehiclePlate: string; reason: string; reasonType: string; fromVehicleCondition?: string }) => patchVehicleSwap(id, swap), []);
  const extendReservation = useCallback((id: string, extension: { newEndDate: string; newReturnTime: string }) => patchExtendReservation(id, extension), []);
  const completeReturn = useCallback((id: string, returnChecklist: { returnMileage: number; fuelLevel: string; hasDamage: boolean; damageDescription?: string; extraCharges?: number; notes?: string; returnPhotos?: string[] }) => patchCompleteReturn(id, returnChecklist), []);
  const markAsPaid = useCallback((id: string) => patchMarkAsPaid(id), []);
  const updateCustomerImages = useCallback((id: string, images: string[]) => patchCustomerImages(id, images), []);
  const updateReservationImages = useCallback((id: string, images: string[]) => patchReservationImages(id, images), []);

  return {
    reservations: loadReservations ? reservationsStore : EMPTY_RESERVATIONS,
    customers,
    addCustomer,
    addReservation,
    cancelReservation,
    swapVehicle,
    extendReservation,
    completeReturn,
    markAsPaid,
    updateCustomerImages,
    updateReservationImages,
    isLoading: (loadReservations && !reservationsLoaded) || !customersLoaded,
  };
}
