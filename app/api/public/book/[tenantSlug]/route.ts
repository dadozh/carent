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

const STR_MAX = 255;
const NOTE_MAX = 2000;

function validatePublicBookingInput(data: unknown): string | null {
  if (!data || typeof data !== "object") return "Invalid request body";
  const d = data as Record<string, unknown>;

  const requiredStrings: Array<[string, number]> = [
    ["vehicleId", STR_MAX],
    ["startDate", 10],
    ["endDate", 10],
    ["pickupLocation", STR_MAX],
    ["returnLocation", STR_MAX],
  ];
  for (const [field, max] of requiredStrings) {
    if (typeof d[field] !== "string" || !(d[field] as string).trim()) {
      return `Missing required field: ${field}`;
    }
    if ((d[field] as string).length > max) return `Field too long: ${field}`;
  }

  const customer = d["customer"];
  if (!customer || typeof customer !== "object") return "Missing customer data";
  const c = customer as Record<string, unknown>;
  const customerFields: Array<[string, number]> = [
    ["firstName", STR_MAX],
    ["lastName", STR_MAX],
    ["email", STR_MAX],
    ["phone", STR_MAX],
    ["licenseNumber", STR_MAX],
    ["licenseExpiry", 10],
    ["address", NOTE_MAX],
  ];
  for (const [field, max] of customerFields) {
    if (typeof c[field] !== "string" || !(c[field] as string).trim()) {
      return `Missing required customer field: ${field}`;
    }
    if ((c[field] as string).length > max) return `Customer field too long: ${field}`;
  }

  if (!Array.isArray(d["extras"])) return "extras must be an array";
  if ((d["extras"] as unknown[]).length > 20) return "Too many extras";

  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = getPublicTenantOrThrow(tenantSlug);
    const data = await request.json();
    const validationError = validatePublicBookingInput(data);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 422 });
    }
    const reservation = createPublicReservation(data, tenant.id);
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking";
    const status = message === "Tenant not found" ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
