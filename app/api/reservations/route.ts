import { createReservation, listReservationsWithTotal } from "@/lib/rental-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "");
  const result = listReservationsWithTotal({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const reservation = createReservation(data);
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reservation";
    return Response.json({ error: message }, { status: 400 });
  }
}
