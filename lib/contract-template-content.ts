import { LOCALE_LABELS, type Locale } from "@/lib/i18n-config";

export type ContractTemplateTextAlign = "left" | "center" | "right";

export interface ContractTemplateBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align: ContractTemplateTextAlign;
  bold?: boolean;
}

export interface ContractTemplateDocument {
  version: 1;
  pageWidth: number;
  pageHeight: number;
  blocks: ContractTemplateBlock[];
}

export interface ContractTemplatePlaceholder {
  token: string;
  label: string;
  sample: string;
}

const TEMPLATE_PAGE_WIDTH = 210;
const TEMPLATE_PAGE_HEIGHT = 297;

function contractLocale(locale: Locale): "en" | "sr" {
  return locale === "sr" ? "sr" : "en";
}

const defaultContent = {
  en: {
    name: "Rental contract",
    title: "Vehicle Rental Agreement",
    headerMeta: [
      "Agreement number: {{contract.number}}",
      "Created: {{contract.createdDate}}",
      "Status: {{reservation.status}}",
    ].join("\n"),
    customerTitle: "Customer",
    customerBody: [
      "Name: {{customer.fullName}}",
      "Email: {{customer.email}}",
      "Phone: {{customer.phone}}",
      "Address: {{customer.address}}",
      "Driver license: {{customer.licenseNumber}}",
      "License valid until: {{customer.licenseExpiry}}",
    ].join("\n"),
    vehicleTitle: "Vehicle",
    vehicleBody: [
      "Vehicle: {{vehicle.fullName}}",
      "Plate: {{vehicle.plate}}",
      "Color: {{vehicle.color}}",
      "Fuel / transmission: {{vehicle.fuelType}} / {{vehicle.transmission}}",
      "Current mileage: {{vehicle.mileage}}",
    ].join("\n"),
    rentalTitle: "Rental",
    rentalBody: [
      "Rental period: {{reservation.period}}",
      "Pickup location: {{reservation.pickupLocation}}",
      "Return location: {{reservation.returnLocation}}",
      "Daily rate: {{reservation.dailyRate}}",
      "Total: {{reservation.totalCost}}",
      "Extras: {{reservation.extras}}",
    ].join("\n"),
    termsTitle: "Basic Terms",
    termsBody: [
      "1. The renter must hold a valid driver license for the entire rental period and must present it on request.",
      "2. Only authorized drivers may operate the vehicle. The renter remains responsible for use by any unauthorized driver.",
      "3. The renter is responsible for returning the vehicle on the agreed date and time, in the same condition except normal wear.",
      "4. The renter is responsible for traffic fines, tolls, parking penalties, administrative charges, and other violations during the rental period.",
      "5. The renter is responsible for loss, theft, damage, vandalism, tire/glass damage, collision damage, and cleaning or refueling charges unless covered by an accepted protection product or applicable law.",
      "6. The renter must report accidents, theft, damage, or mechanical issues immediately and must provide any required police or incident report.",
      "7. The vehicle may not be used for racing, towing, off-road driving, illegal activity, sub-rental, driver training, or transport of hazardous materials.",
      "8. Fuel must be returned at the agreed level. Missing fuel may be charged at the operator's refueling rate.",
      "9. This template is generated for operational use and must be reviewed against local law and the operator's final rental terms before use.",
    ].join("\n\n"),
    signaturesTitle: "Signatures",
    customerSignature: [
      "Customer",
      "",
      "______________________________",
      "Signature",
      "",
      "______________________________",
      "Printed name",
      "",
      "______________________________",
      "Date and time",
    ].join("\n"),
    companySignature: [
      "{{tenant.name}}",
      "",
      "______________________________",
      "Signature",
      "",
      "______________________________",
      "Printed name / stamp",
      "",
      "______________________________",
      "Date and time",
    ].join("\n"),
  },
  sr: {
    name: "Ugovor o najmu",
    title: "Ugovor o najmu vozila",
    headerMeta: [
      "Broj ugovora: {{contract.number}}",
      "Kreirano: {{contract.createdDate}}",
      "Status: {{reservation.status}}",
    ].join("\n"),
    customerTitle: "Klijent",
    customerBody: [
      "Ime i prezime: {{customer.fullName}}",
      "Email: {{customer.email}}",
      "Telefon: {{customer.phone}}",
      "Adresa: {{customer.address}}",
      "Vozačka dozvola: {{customer.licenseNumber}}",
      "Dozvola važi do: {{customer.licenseExpiry}}",
    ].join("\n"),
    vehicleTitle: "Vozilo",
    vehicleBody: [
      "Vozilo: {{vehicle.fullName}}",
      "Registarska oznaka: {{vehicle.plate}}",
      "Boja: {{vehicle.color}}",
      "Gorivo / menjač: {{vehicle.fuelType}} / {{vehicle.transmission}}",
      "Trenutna kilometraža: {{vehicle.mileage}}",
    ].join("\n"),
    rentalTitle: "Najam",
    rentalBody: [
      "Period najma: {{reservation.period}}",
      "Mesto preuzimanja: {{reservation.pickupLocation}}",
      "Mesto vraćanja: {{reservation.returnLocation}}",
      "Dnevna cena: {{reservation.dailyRate}}",
      "Ukupno: {{reservation.totalCost}}",
      "Dodaci: {{reservation.extras}}",
    ].join("\n"),
    termsTitle: "Osnovni uslovi",
    termsBody: [
      "1. Klijent mora imati važeću vozačku dozvolu tokom celog perioda najma i mora je pokazati na zahtev.",
      "2. Vozilom smeju upravljati samo ovlašćeni vozači. Klijent ostaje odgovoran za svaku upotrebu od strane neovlašćenog vozača.",
      "3. Klijent je dužan da vrati vozilo u ugovoreno vreme i u istom stanju, osim uobičajenog habanja.",
      "4. Klijent je odgovoran za saobraćajne kazne, putarine, parking kazne, administrativne troškove i druge prekršaje tokom najma.",
      "5. Klijent je odgovoran za gubitak, krađu, oštećenje, vandalizam, gume/stakla, sudar, čišćenje i dopunu goriva osim ako je pokriveno prihvaćenom zaštitom ili važećim zakonom.",
      "6. Klijent mora odmah prijaviti nezgodu, krađu, oštećenje ili kvar i dostaviti traženi policijski ili drugi izveštaj.",
      "7. Vozilo se ne sme koristiti za trke, vuču, off-road vožnju, nezakonite aktivnosti, podnajam, obuku vozača ili prevoz opasnih materijala.",
      "8. Gorivo mora biti vraćeno na dogovorenom nivou. Nedostajuće gorivo može biti naplaćeno po tarifi kompanije.",
      "9. Ovaj obrazac je operativni šablon i treba ga proveriti prema lokalnom pravu i konačnim uslovima najma pre upotrebe.",
    ].join("\n\n"),
    signaturesTitle: "Potpisi",
    customerSignature: [
      "Klijent",
      "",
      "______________________________",
      "Potpis",
      "",
      "______________________________",
      "Ime i prezime",
      "",
      "______________________________",
      "Datum i vreme",
    ].join("\n"),
    companySignature: [
      "{{tenant.name}}",
      "",
      "______________________________",
      "Potpis",
      "",
      "______________________________",
      "Ime i prezime / pečat",
      "",
      "______________________________",
      "Datum i vreme",
    ].join("\n"),
  },
} as const;

const PLACEHOLDERS: readonly ContractTemplatePlaceholder[] = [
  { token: "{{tenant.name}}", label: "Tenant name", sample: "CARENT Mobility" },
  { token: "{{contract.number}}", label: "Contract number", sample: "1842" },
  { token: "{{contract.createdDate}}", label: "Contract created date", sample: "27.04.2026" },
  { token: "{{customer.fullName}}", label: "Customer name", sample: "Ana Markovic" },
  { token: "{{customer.email}}", label: "Customer email", sample: "ana@example.com" },
  { token: "{{customer.phone}}", label: "Customer phone", sample: "+381 64 123 4567" },
  { token: "{{customer.address}}", label: "Customer address", sample: "Knez Mihailova 12, Beograd" },
  { token: "{{customer.licenseNumber}}", label: "Driver license number", sample: "SRB-1234567" },
  { token: "{{customer.licenseExpiry}}", label: "Driver license expiry", sample: "14.09.2028" },
  { token: "{{vehicle.fullName}}", label: "Vehicle full name", sample: "2024 Skoda Octavia Style" },
  { token: "{{vehicle.plate}}", label: "Vehicle plate", sample: "BG-123-AA" },
  { token: "{{vehicle.color}}", label: "Vehicle color", sample: "Siva" },
  { token: "{{vehicle.fuelType}}", label: "Vehicle fuel type", sample: "Dizel" },
  { token: "{{vehicle.transmission}}", label: "Vehicle transmission", sample: "Automatski" },
  { token: "{{vehicle.mileage}}", label: "Vehicle mileage", sample: "42.500 km" },
  { token: "{{reservation.status}}", label: "Reservation status", sample: "Potvrđeno" },
  { token: "{{reservation.period}}", label: "Reservation period", sample: "27.04.2026 10:00 - 30.04.2026 10:00" },
  { token: "{{reservation.pickupLocation}}", label: "Pickup location", sample: "Aerodrom" },
  { token: "{{reservation.returnLocation}}", label: "Return location", sample: "Centar grada" },
  { token: "{{reservation.dailyRate}}", label: "Daily rate", sample: "EUR 55,00" },
  { token: "{{reservation.totalCost}}", label: "Total cost", sample: "EUR 165,00" },
  { token: "{{reservation.extras}}", label: "Reservation extras", sample: "GPS, Dečje sedište" },
  { token: "{{reservation.notes}}", label: "Reservation notes", sample: "Customer requests infant seat." },
].map((placeholder) => ({ ...placeholder }));

function textBlock(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  align: ContractTemplateTextAlign = "left",
  bold = false
): ContractTemplateBlock {
  return { id, text, x, y, width, height, fontSize, align, bold };
}

export function listContractTemplatePlaceholders(): ContractTemplatePlaceholder[] {
  return PLACEHOLDERS.map((placeholder) => ({ ...placeholder }));
}

export function getContractTemplateDisplayName(locale: Locale): string {
  return `${defaultContent[contractLocale(locale)].name} (${LOCALE_LABELS[locale]})`;
}

export function createDefaultContractTemplateDocument(locale: Locale): ContractTemplateDocument {
  const content = defaultContent[contractLocale(locale)];

  return {
    version: 1,
    pageWidth: TEMPLATE_PAGE_WIDTH,
    pageHeight: TEMPLATE_PAGE_HEIGHT,
    blocks: [
      textBlock("title", content.title, 8, 7, 84, 10, 18, "center", true),
      textBlock("meta", content.headerMeta, 8, 19, 38, 12, 9),
      textBlock("customerTitle", content.customerTitle, 8, 36, 38, 5, 11, "left", true),
      textBlock("customerBody", content.customerBody, 8, 42, 38, 26, 8.6),
      textBlock("vehicleTitle", content.vehicleTitle, 54, 36, 38, 5, 11, "left", true),
      textBlock("vehicleBody", content.vehicleBody, 54, 42, 38, 22, 8.6),
      textBlock("rentalTitle", content.rentalTitle, 8, 70, 84, 5, 11, "left", true),
      textBlock("rentalBody", content.rentalBody, 8, 76, 84, 15, 8.6),
      textBlock("termsTitle", content.termsTitle, 8, 93, 84, 5, 10.5, "left", true),
      textBlock("termsBody", content.termsBody, 8, 99, 84, 95, 7.4),
      textBlock("signaturesTitle", content.signaturesTitle, 8, 201, 84, 5, 11, "left", true),
      textBlock("customerSignature", content.customerSignature, 8, 208, 38, 48, 8.6),
      textBlock("companySignature", content.companySignature, 54, 208, 38, 48, 8.6),
    ],
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function sanitizeContractTemplateDocument(input: unknown, fallbackLocale: Locale): ContractTemplateDocument {
  const fallback = createDefaultContractTemplateDocument(fallbackLocale);

  if (!input || typeof input !== "object") return fallback;

  const source = input as Partial<ContractTemplateDocument> & { blocks?: unknown[] };
  const blocks = Array.isArray(source.blocks) ? source.blocks : [];
  if (!blocks.length) return fallback;

  return {
    version: 1,
    pageWidth: TEMPLATE_PAGE_WIDTH,
    pageHeight: TEMPLATE_PAGE_HEIGHT,
    blocks: blocks
      .map<ContractTemplateBlock | null>((block, index) => {
        if (!block || typeof block !== "object") return null;
        const sourceBlock = block as Partial<ContractTemplateBlock>;
        const width = clamp(Number(sourceBlock.width), 10, 92);
        const height = clamp(Number(sourceBlock.height), 4, 140);
        return {
          id: typeof sourceBlock.id === "string" && sourceBlock.id.trim() ? sourceBlock.id : `block-${index + 1}`,
          text: typeof sourceBlock.text === "string" ? sourceBlock.text : "",
          x: clamp(Number(sourceBlock.x), 0, 100 - width),
          y: clamp(Number(sourceBlock.y), 0, 100 - Math.min(height / TEMPLATE_PAGE_HEIGHT * 100, 100)),
          width,
          height,
          fontSize: clamp(Number(sourceBlock.fontSize), 7, 22),
          align: sourceBlock.align === "center" || sourceBlock.align === "right" ? sourceBlock.align : "left",
          bold: Boolean(sourceBlock.bold),
        } satisfies ContractTemplateBlock;
      })
      .filter((block): block is ContractTemplateBlock => block !== null),
  };
}

export function resolveTemplateText(templateText: string, values: Record<string, string>): string {
  let result = templateText;

  for (const [token, value] of Object.entries(values)) {
    result = result.split(token).join(value);
  }

  return result;
}
