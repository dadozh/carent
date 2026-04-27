import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import type { Tenant } from "@/lib/auth-db";
import {
  resolveTemplateText,
  type ContractTemplateDocument,
} from "@/lib/contract-template-content";
import { formatDate, formatDateTimeRange } from "@/lib/date-format";
import type { Locale } from "@/lib/i18n-config";
import type { Customer, Reservation, Vehicle } from "@/lib/mock-data";

interface ContractPdfInput {
  reservation: Reservation;
  customer: Customer;
  vehicle: Vehicle;
  tenant: Pick<Tenant, "name">;
  locale: Locale;
  currency: string;
  template: ContractTemplateDocument;
}

type ContractLocale = "en" | "sr";

const REGULAR_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const BOLD_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const PAGE_MARGIN = 18;

const statusLabels: Record<ContractLocale, Record<Reservation["status"], string>> = {
  en: {
    pending: "Pending",
    confirmed: "Confirmed",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  sr: {
    pending: "Na čekanju",
    confirmed: "Potvrđeno",
    active: "Aktivno",
    completed: "Završeno",
    cancelled: "Otkazano",
  },
};

const locationLabels: Record<ContractLocale, Record<string, string>> = {
  en: {
    Airport: "Airport",
    Downtown: "Downtown",
    Workshop: "Workshop",
    Storage: "Storage",
  },
  sr: {
    Airport: "Aerodrom",
    Downtown: "Centar grada",
    Workshop: "Radionica",
    Storage: "Skladište",
  },
};

const extraLabels: Record<ContractLocale, Record<string, string>> = {
  en: {
    GPS: "GPS",
    "Wi-Fi": "Wi-Fi",
    "Child Seat": "Child seat",
  },
  sr: {
    GPS: "GPS",
    "Wi-Fi": "Wi-Fi",
    "Child Seat": "Dečje sedište",
  },
};

const fuelLabels: Record<ContractLocale, Record<string, string>> = {
  en: {},
  sr: {
    Gasoline: "Benzin",
    Diesel: "Dizel",
    Hybrid: "Hibrid",
    Electric: "Električni pogon",
    LPG: "TNG",
  },
};

const transmissionLabels: Record<ContractLocale, Record<string, string>> = {
  en: {},
  sr: {
    Manual: "Manuelni",
    Automatic: "Automatski",
    CVT: "CVT",
    "Semi-Auto": "Poluautomatski",
  },
};

const colorLabels: Record<ContractLocale, Record<string, string>> = {
  en: {},
  sr: {
    Black: "Crna",
    White: "Bela",
    Silver: "Srebrna",
    Gray: "Siva",
    Grey: "Siva",
    Red: "Crvena",
    Blue: "Plava",
    Green: "Zelena",
    Yellow: "Žuta",
    Brown: "Braon",
    Orange: "Narandžasta",
  },
};

function contractLocale(locale: Locale): ContractLocale {
  return locale === "sr" ? "sr" : "en";
}

function translate(locale: Locale, table: Record<ContractLocale, Record<string, string>>, value: string) {
  return table[contractLocale(locale)][value] ?? value;
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getReservationContractNumber(id: string) {
  if (/^\d+$/.test(id)) return id;

  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return String(hash || 1);
}

function registerFonts(doc: PDFKit.PDFDocument) {
  if (existsSync(REGULAR_FONT_PATH) && existsSync(BOLD_FONT_PATH)) {
    doc.registerFont("AppRegular", REGULAR_FONT_PATH);
    doc.registerFont("AppBold", BOLD_FONT_PATH);
    return { regular: "AppRegular", bold: "AppBold" };
  }

  return { regular: "Helvetica", bold: "Helvetica-Bold" };
}

function createPdfBuffer(render: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const defaultFont = existsSync(REGULAR_FONT_PATH) ? REGULAR_FONT_PATH : "Helvetica";
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      bufferPages: false,
      font: defaultFont,
      info: {
        Title: "Vehicle Rental Agreement",
        Creator: "Carent",
      },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    render(doc);
    doc.end();
  });
}

function buildTemplateValues({
  reservation,
  customer,
  vehicle,
  tenant,
  locale,
  currency,
}: Omit<ContractPdfInput, "template">): Record<string, string> {
  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`;
  const rentalPeriod = formatDateTimeRange(
    reservation.startDate,
    reservation.pickupTime,
    reservation.endDate,
    reservation.returnTime
  );

  return {
    "{{tenant.name}}": tenant.name,
    "{{contract.number}}": getReservationContractNumber(reservation.id),
    "{{contract.createdDate}}": formatDate(reservation.createdAt),
    "{{customer.fullName}}": `${customer.firstName} ${customer.lastName}`,
    "{{customer.email}}": customer.email,
    "{{customer.phone}}": customer.phone,
    "{{customer.address}}": customer.address || "-",
    "{{customer.licenseNumber}}": customer.licenseNumber,
    "{{customer.licenseExpiry}}": formatDate(customer.licenseExpiry),
    "{{vehicle.fullName}}": vehicleName,
    "{{vehicle.plate}}": vehicle.plate,
    "{{vehicle.color}}": translate(locale, colorLabels, vehicle.color),
    "{{vehicle.fuelType}}": translate(locale, fuelLabels, vehicle.fuelType),
    "{{vehicle.transmission}}": translate(locale, transmissionLabels, vehicle.transmission),
    "{{vehicle.mileage}}": `${vehicle.mileage.toLocaleString("de-DE")} km`,
    "{{reservation.status}}": statusLabels[contractLocale(locale)][reservation.status],
    "{{reservation.period}}": rentalPeriod,
    "{{reservation.pickupLocation}}": translate(locale, locationLabels, reservation.pickupLocation),
    "{{reservation.returnLocation}}": translate(locale, locationLabels, reservation.returnLocation),
    "{{reservation.dailyRate}}": formatMoney(reservation.dailyRate, currency),
    "{{reservation.totalCost}}": formatMoney(reservation.totalCost, currency),
    "{{reservation.extras}}": reservation.extras.length
      ? reservation.extras.map((extra) => translate(locale, extraLabels, extra)).join(", ")
      : (locale === "sr" ? "Nema" : "None"),
    "{{reservation.notes}}": reservation.notes || "-",
  };
}

export async function generateReservationContractPdf(input: ContractPdfInput) {
  const values = buildTemplateValues(input);

  return createPdfBuffer((doc) => {
    const fonts = registerFonts(doc);
    const usableWidth = doc.page.width - PAGE_MARGIN * 2;
    const usableHeight = doc.page.height - PAGE_MARGIN * 2;

    for (const block of input.template.blocks) {
      const x = PAGE_MARGIN + (block.x / 100) * usableWidth;
      const y = PAGE_MARGIN + (block.y / 100) * usableHeight;
      const width = (block.width / 100) * usableWidth;
      const height = Math.max(24, (block.height / input.template.pageHeight) * usableHeight);
      const text = resolveTemplateText(block.text, values);

      doc.font(block.bold ? fonts.bold : fonts.regular)
        .fontSize(block.fontSize)
        .text(text, x, y, {
          width,
          height,
          align: block.align,
          lineGap: 1.4,
        });
    }
  });
}
