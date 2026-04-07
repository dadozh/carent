"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type Vehicle } from "./mock-data";

type VehicleInput = Omit<Vehicle, "id" | "maintenanceLog" | "rentalHistory">;

const VEHICLES_CHANGE_EVENT = "carent-vehicles-change";
const EMPTY_VEHICLES: Vehicle[] = [];

let snapshot: Vehicle[] = EMPTY_VEHICLES;
let loadingPromise: Promise<void> | null = null;
let hasLoaded = false;

function emitVehiclesChange() {
  window.dispatchEvent(new Event(VEHICLES_CHANGE_EVENT));
}

function getVehiclesSnapshot(): Vehicle[] {
  return snapshot;
}

async function refreshVehicles() {
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/api/vehicles", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load vehicles: ${response.status}`);
      }

      const data = await response.json() as { vehicles?: Vehicle[] };
      snapshot = data.vehicles ?? EMPTY_VEHICLES;
      hasLoaded = true;
      emitVehiclesChange();
    })
    .catch((error) => {
      console.error(error);
      hasLoaded = true;
      emitVehiclesChange();
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

function subscribeToVehicles(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(VEHICLES_CHANGE_EVENT, onStoreChange);
  void refreshVehicles();

  return () => {
    window.removeEventListener(VEHICLES_CHANGE_EVENT, onStoreChange);
  };
}

async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const response = await fetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create vehicle: ${response.status}`);
  }

  const data = await response.json() as { vehicle: Vehicle };
  snapshot = [data.vehicle, ...snapshot.filter((vehicle) => vehicle.id !== data.vehicle.id)];
  emitVehiclesChange();
  return data.vehicle;
}

async function patchVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const response = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update vehicle: ${response.status}`);
  }

  const data = await response.json() as { vehicle: Vehicle };
  snapshot = snapshot.map((vehicle) => vehicle.id === id ? data.vehicle : vehicle);
  emitVehiclesChange();
  return data.vehicle;
}

export function useVehicles() {
  const vehicles = useSyncExternalStore(
    subscribeToVehicles,
    getVehiclesSnapshot,
    () => EMPTY_VEHICLES
  );

  const addVehicle = useCallback(
    (data: VehicleInput) => createVehicle(data),
    []
  );

  const updateVehicle = useCallback(
    (id: string, updates: Partial<Vehicle>) => patchVehicle(id, updates),
    []
  );

  const getVehicle = useCallback(
    (id: string) => vehicles.find((vehicle) => vehicle.id === id),
    [vehicles]
  );

  return { vehicles, addVehicle, updateVehicle, getVehicle, isLoading: !hasLoaded };
}
