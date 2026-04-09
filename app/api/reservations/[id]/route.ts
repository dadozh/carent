import { updateReservationImages, updateReservationStatus, swapReservationVehicle, extendReservation, completeReservationReturn, markReservationPaid } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";
import { canUsePlanFeature } from "@/lib/plan-features";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, session] = await Promise.all([params, getApiSession()]);
    const { tenantId, userId, userName, role, plan } = session;
    const data = await request.json();

    let reservation;
    let action: string;
    let detail: string;

    if (Array.isArray(data.images)) {
      assertCan(role, "writeReservation");
      reservation = updateReservationImages(id, data.images, tenantId);
      action = "updated_images";
      detail = `Updated reservation photos`;
    } else if (data.vehicleSwap) {
      assertCan(role, "swapVehicle");
      reservation = swapReservationVehicle(id, data.vehicleSwap, tenantId);
      action = "swapped_vehicle";
      detail = `Swapped to ${data.vehicleSwap.toVehicleName} (${data.vehicleSwap.toVehiclePlate}) — ${data.vehicleSwap.reasonType}`;
    } else if (data.extension) {
      assertCan(role, "extendReservation");
      reservation = extendReservation(id, data.extension, tenantId);
      action = "extended";
      detail = `Extended return date to ${data.extension.newEndDate} ${data.extension.newReturnTime}`;
    } else if (data.returnChecklist) {
      assertCan(role, "completeReturn");
      if (!canUsePlanFeature(plan, "returnPhotos")) {
        data.returnChecklist.returnPhotos = undefined;
      }
      reservation = completeReservationReturn(id, data.returnChecklist, tenantId);
      action = "completed_return";
      detail = `Return completed — ${data.returnChecklist.returnMileage} km, fuel: ${data.returnChecklist.fuelLevel}${data.returnChecklist.hasDamage ? ", damage reported" : ""}`;
    } else if (data.payment) {
      assertCan(role, "markAsPaid");
      reservation = markReservationPaid(id, data.payment, tenantId);
      action = "marked_paid";
      detail = `Marked as paid (${data.payment.method})`;
    } else {
      assertCan(role, "cancelReservation");
      reservation = updateReservationStatus(id, data, tenantId);
      action = `status_changed_to_${data.status}`;
      detail = data.cancellationReason ? `Cancelled — ${data.cancellationReason}` : `Status changed to ${data.status}`;
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
