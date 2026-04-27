import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import type { Customer, Reservation, Vehicle } from "@/lib/mock-data";
import { formatDate, formatDateTimeRange } from "@/lib/date-format";
import type { Locale } from "@/lib/i18n-config";

interface ContractPdfInput {
  reservation: Reservation;
  customer: Customer;
  vehicle: Vehicle;
  locale: Locale;
  currency: string;
}

type ContractLabelSet = {
  title: string;
  agreementNumber: string;
  created: string;
  status: string;
  customerTitle: string;
  vehicleTitle: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  driverLicense: string;
  licenseValidUntil: string;
  vehicle: string;
  plate: string;
  color: string;
  fuelTransmission: string;
  mileage: string;
  rentalTitle: string;
  rentalPeriod: string;
  pickupLocation: string;
  returnLocation: string;
  dailyRate: string;
  total: string;
  extras: string;
  none: string;
  termsTitle: string;
  signaturesTitle: string;
  customerSignature: string;
  companySignature: string;
  signature: string;
  printedName: string;
  printedNameStamp: string;
  dateTime: string;
};

type ContractLocale = "en" | "sr";

const REGULAR_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const BOLD_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const PAGE_MARGIN = 42;
const COLUMN_GAP = 24;

function contractLocale(locale: Locale): ContractLocale {
  return locale === "sr" ? "sr" : "en";
}

const labels: Record<ContractLocale, ContractLabelSet> = {
  en: {
    title: "Vehicle Rental Agreement",
    agreementNumber: "Agreement number",
    created: "Created",
    status: "Status",
    customerTitle: "Customer",
    vehicleTitle: "Vehicle",
    name: "Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    driverLicense: "Driver license",
    licenseValidUntil: "License valid until",
    vehicle: "Vehicle",
    plate: "Plate",
    color: "Color",
    fuelTransmission: "Fuel / transmission",
    mileage: "Current mileage",
    rentalTitle: "Rental",
    rentalPeriod: "Rental period",
    pickupLocation: "Pickup location",
    returnLocation: "Return location",
    dailyRate: "Daily rate",
    total: "Total",
    extras: "Extras",
    none: "None",
    termsTitle: "Basic Terms",
    signaturesTitle: "Signatures",
    customerSignature: "Customer",
    companySignature: "Car rental company",
    signature: "Signature",
    printedName: "Printed name",
    printedNameStamp: "Printed name / stamp",
    dateTime: "Date and time",
  },
  sr: {
    title: "Ugovor o najmu vozila",
    agreementNumber: "Broj ugovora",
    created: "Kreirano",
    status: "Status",
    customerTitle: "Klijent",
    vehicleTitle: "Vozilo",
    name: "Ime i prezime",
    email: "Email",
    phone: "Telefon",
    address: "Adresa",
    driverLicense: "Vozačka dozvola",
    licenseValidUntil: "Dozvola važi do",
    vehicle: "Vozilo",
    plate: "Registarska oznaka",
    color: "Boja",
    fuelTransmission: "Gorivo / menjač",
    mileage: "Trenutna kilometraža",
    rentalTitle: "Najam",
    rentalPeriod: "Period najma",
    pickupLocation: "Mesto preuzimanja",
    returnLocation: "Mesto vraćanja",
    dailyRate: "Dnevna cena",
    total: "Ukupno",
    extras: "Dodaci",
    none: "Nema",
    termsTitle: "Osnovni uslovi",
    signaturesTitle: "Potpisi",
    customerSignature: "Klijent",
    companySignature: "Rent-a-car kompanija",
    signature: "Potpis",
    printedName: "Ime i prezime",
    printedNameStamp: "Ime i prezime / pečat",
    dateTime: "Datum i vreme",
  },
};

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

const terms: Record<ContractLocale, string[]> = {
  en: [
    "1. The renter must hold a valid driver license for the entire rental period and must present it on request.",
    "2. Only authorized drivers may operate the vehicle. The renter remains responsible for use by any unauthorized driver.",
    "3. The renter is responsible for returning the vehicle on the agreed date and time, in the same condition except normal wear.",
    "4. The renter is responsible for traffic fines, tolls, parking penalties, administrative charges, and other violations during the rental period.",
    "5. The renter is responsible for loss, theft, damage, vandalism, tire/glass damage, collision damage, and cleaning or refueling charges unless covered by an accepted protection product or applicable law.",
    "6. The renter must report accidents, theft, damage, or mechanical issues immediately and must provide any required police or incident report.",
    "7. The vehicle may not be used for racing, towing, off-road driving, illegal activity, sub-rental, driver training, or transport of hazardous materials.",
    "8. Fuel must be returned at the agreed level. Missing fuel may be charged at the operator's refueling rate.",
    "9. This template is generated for operational use and must be reviewed against local law and the operator's final rental terms before use.",
  ],
  sr: [
    "1. Klijent mora imati važeću vozačku dozvolu tokom celog perioda najma i mora je pokazati na zahtev.",
    "2. Vozilom smeju upravljati samo ovlašćeni vozači. Klijent ostaje odgovoran za svaku upotrebu od strane neovlašćenog vozača.",
    "3. Klijent je dužan da vrati vozilo u ugovoreno vreme i u istom stanju, osim uobičajenog habanja.",
    "4. Klijent je odgovoran za saobraćajne kazne, putarine, parking kazne, administrativne troškove i druge prekršaje tokom najma.",
    "5. Klijent je odgovoran za gubitak, krađu, oštećenje, vandalizam, gume/stakla, sudar, čišćenje i dopunu goriva osim ako je pokriveno prihvaćenom zaštitom ili važećim zakonom.",
    "6. Klijent mora odmah prijaviti nezgodu, krađu, oštećenje ili kvar i dostaviti traženi policijski ili drugi izveštaj.",
    "7. Vozilo se ne sme koristiti za trke, vuču, off-road vožnju, nezakonite aktivnosti, podnajam, obuku vozača ili prevoz opasnih materija.",
    "8. Gorivo mora biti vraćeno na dogovorenom nivou. Nedostajuće gorivo može biti naplaćeno po tarifi kompanije.",
    "9. Ovaj obrazac je operativni šablon i treba ga proveriti prema lokalnom pravu i konačnim uslovima najma pre upotrebe.",
  ],
};

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

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + height > bottom) doc.addPage();
}

function renderHeading(
  doc: PDFKit.PDFDocument,
  fonts: ReturnType<typeof registerFonts>,
  label: string,
  size = 11
) {
  ensureSpace(doc, 24);
  doc.moveDown(0.4);
  doc.font(fonts.bold).fontSize(size).text(label);
  doc.moveDown(0.25);
}

function renderRows(
  doc: PDFKit.PDFDocument,
  fonts: ReturnType<typeof registerFonts>,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  width: number
) {
  let currentY = y;

  for (const [label, value] of rows) {
    doc.font(fonts.bold).fontSize(8.5).text(`${label}: `, x, currentY, {
      continued: true,
      width,
    });
    doc.font(fonts.regular).fontSize(8.5).text(value || "-", { width });
    currentY = doc.y + 4;
  }

  return currentY;
}

function renderInfoBlock(
  doc: PDFKit.PDFDocument,
  fonts: ReturnType<typeof registerFonts>,
  title: string,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  width: number
) {
  doc.font(fonts.bold).fontSize(11).text(title, x, y, { width });
  return renderRows(doc, fonts, rows, x, doc.y + 7, width);
}

function renderSignatureBlock(
  doc: PDFKit.PDFDocument,
  fonts: ReturnType<typeof registerFonts>,
  title: string,
  signatureLabel: string,
  printedNameLabel: string,
  dateLabel: string,
  x: number,
  y: number,
  width: number
) {
  doc.font(fonts.bold).fontSize(10).text(title, x, y, { width });
  let currentY = doc.y + 28;
  doc.font(fonts.regular).fontSize(9).text("______________________________", x, currentY, { width });
  currentY += 15;
  doc.font(fonts.regular).fontSize(8).text(signatureLabel, x, currentY, { width });
  currentY += 34;
  doc.font(fonts.regular).fontSize(9).text("______________________________", x, currentY, { width });
  currentY += 15;
  doc.font(fonts.regular).fontSize(8).text(printedNameLabel, x, currentY, { width });
  currentY += 34;
  doc.font(fonts.regular).fontSize(9).text("______________________________", x, currentY, { width });
  currentY += 15;
  doc.font(fonts.regular).fontSize(8).text(dateLabel, x, currentY, { width });
  return doc.y;
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

export async function generateReservationContractPdf({
  reservation,
  customer,
  vehicle,
  locale,
  currency,
}: ContractPdfInput) {
  const pdfLocale = contractLocale(locale);
  const t = labels[pdfLocale];
  const rentalPeriod = formatDateTimeRange(
    reservation.startDate,
    reservation.pickupTime,
    reservation.endDate,
    reservation.returnTime
  );
  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`;
  const width = 595.28 - PAGE_MARGIN * 2;
  const columnWidth = (width - COLUMN_GAP) / 2;

  return createPdfBuffer((doc) => {
    const fonts = registerFonts(doc);

    doc.font(fonts.bold).fontSize(17).text(t.title, { align: "center" });
    doc.moveDown(0.8);
    doc.font(fonts.regular).fontSize(9);
    doc.text(`${t.agreementNumber}: ${getReservationContractNumber(reservation.id)}`);
    doc.text(`${t.created}: ${formatDate(reservation.createdAt)}`);
    doc.text(`${t.status}: ${statusLabels[pdfLocale][reservation.status]}`);

    doc.moveDown(1);
    const startY = doc.y;
    const leftX = doc.page.margins.left;
    const rightX = leftX + columnWidth + COLUMN_GAP;
    const customerBottom = renderInfoBlock(
      doc,
      fonts,
      t.customerTitle,
      [
        [t.name, `${customer.firstName} ${customer.lastName}`],
        [t.email, customer.email],
        [t.phone, customer.phone],
        [t.address, customer.address || "-"],
        [t.driverLicense, customer.licenseNumber],
        [t.licenseValidUntil, formatDate(customer.licenseExpiry)],
      ],
      leftX,
      startY,
      columnWidth
    );
    const vehicleBottom = renderInfoBlock(
      doc,
      fonts,
      t.vehicleTitle,
      [
        [t.vehicle, vehicleName],
        [t.plate, vehicle.plate],
        [t.color, translate(locale, colorLabels, vehicle.color)],
        [
          t.fuelTransmission,
          `${translate(locale, fuelLabels, vehicle.fuelType)} / ${translate(locale, transmissionLabels, vehicle.transmission)}`,
        ],
        [t.mileage, `${vehicle.mileage.toLocaleString("de-DE")} km`],
      ],
      rightX,
      startY,
      columnWidth
    );
    doc.y = Math.max(customerBottom, vehicleBottom) + 6;

    renderHeading(doc, fonts, t.rentalTitle);
    renderRows(
      doc,
      fonts,
      [
        [t.rentalPeriod, rentalPeriod],
        [t.pickupLocation, translate(locale, locationLabels, reservation.pickupLocation)],
        [t.returnLocation, translate(locale, locationLabels, reservation.returnLocation)],
        [t.dailyRate, formatMoney(reservation.dailyRate, currency)],
        [t.total, formatMoney(reservation.totalCost, currency)],
        [
          t.extras,
          reservation.extras.length
            ? reservation.extras.map((extra) => translate(locale, extraLabels, extra)).join(", ")
            : t.none,
        ],
      ],
      leftX,
      doc.y,
      width
    );

    renderHeading(doc, fonts, t.termsTitle, 10);
    doc.font(fonts.regular).fontSize(7.3);
    for (const term of terms[pdfLocale]) {
      ensureSpace(doc, 24);
      doc.text(term, {
        width,
        lineGap: 1.4,
      });
      doc.moveDown(0.25);
    }

    ensureSpace(doc, 170);
    renderHeading(doc, fonts, t.signaturesTitle, 11);
    const signatureY = doc.y + 4;
    const customerSignatureBottom = renderSignatureBlock(
      doc,
      fonts,
      t.customerSignature,
      t.signature,
      t.printedName,
      t.dateTime,
      leftX,
      signatureY,
      columnWidth
    );
    const companySignatureBottom = renderSignatureBlock(
      doc,
      fonts,
      t.companySignature,
      t.signature,
      t.printedNameStamp,
      t.dateTime,
      rightX,
      signatureY,
      columnWidth
    );
    doc.y = Math.max(customerSignatureBottom, companySignatureBottom);
  });
}
