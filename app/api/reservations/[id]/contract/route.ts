import { generateReservationContractPdf, getReservationContractNumber } from "@/lib/contract-pdf";
import type { Locale } from "@/lib/i18n";
import { getCustomerById, getReservationById } from "@/lib/rental-db";
import { getVehicleById } from "@/lib/vehicle-db";
import { getTenantSettings } from "@/lib/auth-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "read");

    const { searchParams } = new URL(request.url);
    const requestedLocale = searchParams.get("lang");
    const locale: Locale = requestedLocale === "sr" ? "sr" : "en";
    const reservation = await getReservationById(id, tenantId);

    if (!reservation) return Response.json({ error: "Reservation not found" }, { status: 404 });

    const [customer, vehicle, { currency }] = await Promise.all([
      getCustomerById(reservation.customerId, tenantId),
      getVehicleById(reservation.vehicleId, tenantId),
      getTenantSettings(tenantId),
    ]);

    if (!customer) return Response.json({ error: "Reservation customer not found" }, { status: 404 });
    if (!vehicle) return Response.json({ error: "Reservation vehicle not found" }, { status: 404 });

    const pdf = await generateReservationContractPdf({ reservation, customer, vehicle, locale, currency });
    const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    const contractNumber = getReservationContractNumber(reservation.id);

    return new Response(pdfBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rental-contract-${locale}-${contractNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
