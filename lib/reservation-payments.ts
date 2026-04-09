import type { Reservation } from "@/lib/mock-data";

export function getReservationPayments(reservation: Reservation) {
  const legacyPayment = reservation.payment
    ? [{
        paidAt: reservation.payment.paidAt,
        method: reservation.payment.method,
        amount: reservation.payment.amountPaid ?? reservation.totalCost,
      }]
    : [];

  const payments = reservation.payments ?? legacyPayment;
  return payments.filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0);
}

export function getReservationPaidAmount(reservation: Reservation) {
  return getReservationPayments(reservation).reduce((sum, payment) => sum + payment.amount, 0);
}

export function getReservationOutstandingAmount(reservation: Reservation) {
  return Math.max(0, reservation.totalCost - getReservationPaidAmount(reservation));
}

export function isReservationFullyPaid(reservation: Reservation) {
  return getReservationOutstandingAmount(reservation) <= 0;
}
