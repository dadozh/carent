import { getTenantBySlug } from "@/lib/auth-db";
import { RESERVATION_BLOCKING_STATUSES, reservationBlocksPeriod } from "@/lib/reservation-rules";
import { createPublicReservation, listReservations } from "@/lib/rental-db";
import { listVehicles } from "@/lib/vehicle-db";

export const runtime = "nodejs";

function getPublicTenantOrThrow(tenantSlug: string) {
  const tenant = getTenantBySlug(tenantSlug);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = getPublicTenantOrThrow(tenantSlug);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") ?? "";
    const endDate = searchParams.get("endDate") ?? "";
    const periodStart = startDate ? new Date(`${startDate}T09:00`).getTime() : Number.NaN;
    const periodEnd = endDate ? new Date(`${endDate}T09:00`).getTime() : Number.NaN;
    const reservations = startDate && endDate ? listReservations(tenant.id) : [];

    const vehicles = listVehicles(tenant.id).filter((vehicle) => {
      if (vehicle.status !== "available") return false;
      if (!startDate || !endDate) return true;

      const hasConflict = reservations.some((reservation) =>
        reservation.vehicleId === vehicle.id &&
        RESERVATION_BLOCKING_STATUSES.includes(reservation.status) &&
        reservationBlocksPeriod(reservation, periodStart, periodEnd)
      );

      return !hasConflict;
    });

    return Response.json({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      vehicles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load public booking data";
    const status = message === "Tenant not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = getPublicTenantOrThrow(tenantSlug);
    const data = await request.json();
    const reservation = createPublicReservation(data, tenant.id);
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking";
    const status = message === "Tenant not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
