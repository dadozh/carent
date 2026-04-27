import { readFile } from "node:fs/promises";
import { getTenantById } from "@/lib/auth-db";
import { generateReservationContractPdf, getReservationContractNumber } from "@/lib/contract-pdf";
import { getGeneratedContract, getPublishedContractTemplate, saveGeneratedContractArchive } from "@/lib/contract-template-db";
import { resolveContractLocale } from "@/lib/i18n-config";
import { getCustomerById, getReservationById } from "@/lib/rental-db";
import { createStoredFilename, getStoredFilePathFromUrl, storage } from "@/lib/storage-server";
import { buildTenantUploadPrefix } from "@/lib/upload-policy";
import { getVehicleById } from "@/lib/vehicle-db";
import { getTenantSettings } from "@/lib/auth-db";
import { getApiSession } from "@/lib/api-session";
import { assertCan } from "@/lib/permissions";

export const runtime = "nodejs";

function shouldArchiveContract(reservation: { status: string; endDate: string; returnTime: string }) {
  if (reservation.status === "completed" || reservation.status === "cancelled") return true;
  const returnAt = new Date(`${reservation.endDate}T${reservation.returnTime}`);
  return Number.isFinite(returnAt.getTime()) && returnAt.getTime() < Date.now();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "read");

    const { searchParams } = new URL(request.url);
    const requestedLocale = searchParams.get("lang");
    const reservation = await getReservationById(id, tenantId);

    if (!reservation) return Response.json({ error: "Reservation not found" }, { status: 404 });

    const [customer, vehicle, settings, tenant] = await Promise.all([
      getCustomerById(reservation.customerId, tenantId),
      getVehicleById(reservation.vehicleId, tenantId),
      getTenantSettings(tenantId),
      getTenantById(tenantId),
    ]);
    const locale = resolveContractLocale(requestedLocale, settings.contractLanguages, settings.defaultContractLanguage);

    if (!customer) return Response.json({ error: "Reservation customer not found" }, { status: 404 });
    if (!vehicle) return Response.json({ error: "Reservation vehicle not found" }, { status: 404 });
    if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });

    const archived = await getGeneratedContract(tenantId, reservation.id, locale);
    if (archived) {
      const archivedBody = await readFile(getStoredFilePathFromUrl(archived.fileUrl));
      const contractNumber = getReservationContractNumber(reservation.id);
      return new Response(archivedBody, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="rental-contract-${locale}-${contractNumber}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const template = await getPublishedContractTemplate(tenantId, locale);
    if (!template) {
      return Response.json({ error: "Publish a contract template for this language before generating contracts" }, { status: 409 });
    }

    const pdf = await generateReservationContractPdf({
      reservation,
      customer,
      vehicle,
      tenant,
      locale,
      locations: settings.locations,
      extras: settings.extras,
      currency: settings.currency,
      template: template.published ?? template.draft,
    });
    const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    const contractNumber = getReservationContractNumber(reservation.id);

    if (shouldArchiveContract(reservation)) {
      try {
        const prefix = buildTenantUploadPrefix(tenantId, "contracts");
        const fileUrl = await storage.save(Buffer.from(pdf), createStoredFilename(prefix, `contract-${locale}-${contractNumber}.pdf`));
        await saveGeneratedContractArchive({
          tenantId,
          reservationId: reservation.id,
          language: locale,
          templateId: template.id,
          fileUrl,
        });
      } catch {
        // Archiving is best effort; contract download must still succeed.
      }
    }

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
