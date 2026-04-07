import type { Reservation, ReservationStatus } from "@/lib/mock-data";

export const VEHICLE_TURNAROUND_HOURS = 2;
export const VEHICLE_TURNAROUND_MS = VEHICLE_TURNAROUND_HOURS * 60 * 60 * 1000;
export const RESERVATION_BLOCKING_STATUSES: ReservationStatus[] = ["pending", "confirmed", "active"];

export function getReservationStartTime(reservation: Pick<Reservation, "startDate" | "pickupTime">) {
  return new Date(`${reservation.startDate}T${reservation.pickupTime}`).getTime();
}

export function getReservationEndTime(reservation: Pick<Reservation, "endDate" | "returnTime">) {
  return new Date(`${reservation.endDate}T${reservation.returnTime}`).getTime();
}

export function getReservationBlockedUntilTime(reservation: Pick<Reservation, "endDate" | "returnTime">) {
  return getReservationEndTime(reservation) + VEHICLE_TURNAROUND_MS;
}

export function reservationBlocksPeriod(
  reservation: Pick<Reservation, "startDate" | "pickupTime" | "endDate" | "returnTime">,
  periodStart: number,
  periodEnd: number
) {
  const blockedStart = getReservationStartTime(reservation);
  const blockedEnd = getReservationBlockedUntilTime(reservation);

  if (
    Number.isNaN(periodStart) ||
    Number.isNaN(periodEnd) ||
    Number.isNaN(blockedStart) ||
    Number.isNaN(blockedEnd)
  ) {
    return false;
  }

  return periodStart < blockedEnd && blockedStart < periodEnd;
}
