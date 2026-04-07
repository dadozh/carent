import { generateReservationContractPdf, getReservationContractNumber } from "@/lib/contract-pdf";
import type { Locale } from "@/lib/i18n";
import { getCustomerById, getReservationById } from "@/lib/rental-db";
import { getVehicleById } from "@/lib/vehicle-db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestedLocale = searchParams.get("lang");
  const locale: Locale = requestedLocale === "sr" ? "sr" : "en";
  const reservation = getReservationById(id);

  if (!reservation) {
    return Response.json({ error: "Reservation not found" }, { status: 404 });
  }

  const customer = getCustomerById(reservation.customerId);
  const vehicle = getVehicleById(reservation.vehicleId);

  if (!customer) {
    return Response.json({ error: "Reservation customer not found" }, { status: 404 });
  }

  if (!vehicle) {
    return Response.json({ error: "Reservation vehicle not found" }, { status: 404 });
  }

  const pdf = await generateReservationContractPdf({ reservation, customer, vehicle, locale });
  const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  const contractNumber = getReservationContractNumber(reservation.id);

  return new Response(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rental-contract-${locale}-${contractNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
