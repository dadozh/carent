import { updateReservationImages, updateReservationStatus } from "@/lib/rental-db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await request.json();
    const reservation = Array.isArray(data.images)
      ? updateReservationImages(id, data.images)
      : updateReservationStatus(id, data);
    return Response.json({ reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update reservation";
    const status = message === "Reservation not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
