import { updateReservationImages, updateReservationStatus, swapReservationVehicle, extendReservation, completeReservationReturn, markReservationPaid } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";
import { canUsePlanFeature } from "@/lib/plan-features";
import type { Reservation } from "@/lib/mock-data";

export const runtime = "nodejs";

function buildReservationAuditDetail(
  reservation: Reservation,
  extra: {
    metadata?: Array<{ key: string; value: string }>;
    note?: string;
  } = {}
) {
  return JSON.stringify({
    summary: `${reservation.customerName} - ${reservation.vehicleName}`,
    subtitle: `#${reservation.id}`,
    metadata: [
      { key: "vehiclePlate", value: reservation.vehiclePlate },
      { key: "period", value: `${reservation.startDate} ${reservation.pickupTime} -> ${reservation.endDate} ${reservation.returnTime}` },
      ...(extra.metadata ?? []),
    ],
    note: extra.note,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, session] = await Promise.all([params, getApiSession()]);
    const { tenantId, userId, userName, role, plan, featureOverrides } = session;
    const data = await request.json();

    let reservation;
    let action: string;
    let detail: string;

    if (Array.isArray(data.images)) {
      assertCan(role, "writeReservation");
      reservation = updateReservationImages(id, data.images, tenantId);
      action = "updated_images";
      detail = buildReservationAuditDetail(reservation, {
        metadata: [{ key: "photoCount", value: String(data.images.length) }],
      });
    } else if (data.vehicleSwap) {
      assertCan(role, "swapVehicle");
      reservation = swapReservationVehicle(id, data.vehicleSwap, tenantId);
      action = "swapped_vehicle";
      detail = buildReservationAuditDetail(reservation, {
        metadata: [
          { key: "swappedTo", value: `${data.vehicleSwap.toVehicleName} (${data.vehicleSwap.toVehiclePlate})` },
          { key: "reasonType", value: data.vehicleSwap.reasonType },
        ],
      });
    } else if (data.extension) {
      assertCan(role, "extendReservation");
      reservation = extendReservation(id, data.extension, tenantId);
      action = "extended";
      detail = buildReservationAuditDetail(reservation, {
        metadata: [{ key: "newReturnDate", value: `${data.extension.newEndDate} ${data.extension.newReturnTime}` }],
      });
    } else if (data.returnChecklist) {
      assertCan(role, "completeReturn");
      if (!canUsePlanFeature(plan, "returnPhotos", featureOverrides)) {
        data.returnChecklist.returnPhotos = undefined;
      }
      reservation = completeReservationReturn(id, data.returnChecklist, tenantId);
      action = "completed_return";
      detail = buildReservationAuditDetail(reservation, {
        metadata: [
          { key: "returnMileage", value: `${data.returnChecklist.returnMileage}` },
          { key: "fuelLevel", value: data.returnChecklist.fuelLevel },
          { key: "damageReported", value: data.returnChecklist.hasDamage ? "yes" : "no" },
        ],
        note: data.returnChecklist.damageDescription || data.returnChecklist.notes || undefined,
      });
    } else if (data.payment) {
      assertCan(role, "markAsPaid");
      reservation = markReservationPaid(id, data.payment, tenantId);
      action = "marked_paid";
      detail = buildReservationAuditDetail(reservation, {
        metadata: [
          { key: "paymentMethod", value: data.payment.method },
          { key: "paidAmount", value: String(data.payment.amount ?? reservation.totalCost) },
        ],
      });
    } else if (data.status === "active") {
      assertCan(role, "startRental");
      reservation = updateReservationStatus(id, data, tenantId);
      action = "started_rental";
      detail = buildReservationAuditDetail(reservation);
    } else {
      assertCan(role, "cancelReservation");
      reservation = updateReservationStatus(id, data, tenantId);
      action = `status_changed_to_${data.status}`;
      detail = buildReservationAuditDetail(reservation, {
        metadata: [{ key: "status", value: data.status }],
        note: data.cancellationReason || undefined,
      });
    }

    logAction({ tenantId, userId, userName, userRole: role, entityType: "reservation", entityId: id, action, detail });
    return Response.json({ reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update reservation";
    const status =
      message === "Unauthorized" ? 401
      : message.startsWith("Forbidden") ? 403
      : message === "Reservation not found" ? 404
      : 400;
    return Response.json({ error: message }, { status });
  }
}
