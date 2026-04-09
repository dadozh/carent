import { createReservation, listReservationsWithTotal } from "@/lib/rental-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";
import { logAction } from "@/lib/audit-db";
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

export async function GET(request: Request) {
  try {
    const { tenantId, role } = await getApiSession();
    assertCan(role, "read");
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "");
    const result = listReservationsWithTotal(tenantId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      overdue: ["1", "true"].includes((searchParams.get("overdue") ?? "").toLowerCase()),
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, userId, userName, role } = await getApiSession();
    assertCan(role, "writeReservation");
    const data = await request.json();
    const reservation = createReservation(data, tenantId);
    logAction({
      tenantId,
      userId,
      userName,
      userRole: role,
      entityType: "reservation",
      entityId: reservation.id,
      action: "created",
      detail: buildReservationAuditDetail(reservation),
    });
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reservation";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status });
  }
}
