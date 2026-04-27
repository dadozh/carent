import { getApiSession } from "@/lib/api-session";
import { sanitizeContractTemplateDocument } from "@/lib/contract-template-content";
import { generateReservationContractPdf } from "@/lib/contract-pdf";
import { getTenantById, getTenantSettings } from "@/lib/auth-db";
import { isLocale } from "@/lib/i18n-config";
import { assertCan } from "@/lib/permissions";
import { listReservations, getCustomerById } from "@/lib/rental-db";
import { getVehicleById } from "@/lib/vehicle-db";
import type { Customer, Reservation, Vehicle } from "@/lib/mock-data";

export const runtime = "nodejs";

const SAMPLE_CUSTOMER: Customer = {
  id: "preview-customer",
  firstName: "Ana",
  lastName: "Markovic",
  email: "ana@example.com",
  phone: "+381 64 123 4567",
  licenseNumber: "SRB-1234567",
  licenseExpiry: "2028-09-14",
  verified: true,
  address: "Knez Mihailova 12, Beograd",
  totalRentals: 3,
  totalSpent: 495,
  images: [],
};

const SAMPLE_VEHICLE: Vehicle = {
  id: "preview-vehicle",
  make: "Skoda",
  model: "Octavia",
  trim: "Style",
  year: 2024,
  category: "sedan",
  plate: "BG-123-AA",
  color: "Gray",
  mileage: 42500,
  dailyRate: 55,
  status: "available",
  location: "Airport",
  fuelType: "Diesel",
  transmission: "Automatic",
  seats: 5,
  luggageCount: 2,
  image: "",
  images: [],
  lastService: "2025-01-01",
  nextService: "2026-01-01",
  maintenanceLog: [],
  rentalHistory: [],
};

const SAMPLE_RESERVATION: Reservation = {
  id: "1842",
  customerId: "preview-customer",
  customerName: "Ana Markovic",
  vehicleId: "preview-vehicle",
  vehicleName: "2024 Skoda Octavia Style",
  vehiclePlate: "BG-123-AA",
  startDate: "2026-04-27",
  pickupTime: "10:00",
  endDate: "2026-04-30",
  returnTime: "10:00",
  status: "confirmed",
  dailyRate: 55,
  totalCost: 165,
  extras: ["GPS", "Child Seat"],
  pickupLocation: "Airport",
  returnLocation: "Downtown",
  notes: "Customer requests infant seat.",
  createdAt: "2026-04-27T08:00:00.000Z",
  images: [],
};

async function resolvePreviewData(tenantId: string): Promise<{
  reservation: Reservation;
  customer: Customer;
  vehicle: Vehicle;
}> {
  const recent = await listReservations(tenantId, { limit: 1 });
  const reservation = recent[0];
  if (!reservation) return { reservation: SAMPLE_RESERVATION, customer: SAMPLE_CUSTOMER, vehicle: SAMPLE_VEHICLE };

  const [customer, vehicle] = await Promise.all([
    getCustomerById(reservation.customerId, tenantId),
    getVehicleById(reservation.vehicleId, tenantId),
  ]);

  if (!customer || !vehicle) return { reservation: SAMPLE_RESERVATION, customer: SAMPLE_CUSTOMER, vehicle: SAMPLE_VEHICLE };

  return { reservation, customer, vehicle };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ language: string }> }
) {
  try {
    const [{ language }, { tenantId, role }] = await Promise.all([params, getApiSession()]);
    assertCan(role, "manageSettings");
    if (!isLocale(language)) return Response.json({ error: "Unsupported language" }, { status: 400 });

    const body = await request.json() as { name?: string; draft?: unknown };
    const draft = sanitizeContractTemplateDocument(body.draft, language);

    const [settings, tenant, previewData] = await Promise.all([
      getTenantSettings(tenantId),
      getTenantById(tenantId),
      resolvePreviewData(tenantId),
    ]);
    if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });

    const pdf = await generateReservationContractPdf({
      ...previewData,
      tenant,
      locale: language,
      currency: settings.currency,
      template: draft,
    });

    const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(pdfBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="template-preview.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview generation failed";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
