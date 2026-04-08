import { updateReservationImages, updateReservationStatus, swapReservationVehicle } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    const data = await request.json();

    let reservation;
    if (Array.isArray(data.images)) {
      assertCan(role, "writeReservation");
      reservation = updateReservationImages(id, data.images, tenantId);
    } else if (data.vehicleSwap) {
      assertCan(role, "swapVehicle");
      reservation = swapReservationVehicle(id, data.vehicleSwap, tenantId);
    } else {
      assertCan(role, "cancelReservation");
      reservation = updateReservationStatus(id, data, tenantId);
    }

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
