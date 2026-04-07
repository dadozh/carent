/**
 * VIN decode via NHTSA vPIC API (free, no auth required).
 * Docs: https://vpic.nhtsa.dot.gov/api/
 */

export interface VinDecodeResult {
  make: string;
  model: string;
  year: number | null;
  trim: string;
  fuelType: string;
  transmission: string;
  bodyClass: string;
  seats: number | null;
  engineDisplacement: string;
}

interface NhtsaValue {
  Variable: string;
  Value: string | null;
}

const FUEL_MAP: Record<string, string> = {
  gasoline: "Gasoline",
  petrol: "Gasoline",
  diesel: "Diesel",
  electric: "Electric",
  hybrid: "Hybrid",
  "plug-in hybrid": "Hybrid",
  lpg: "LPG",
  cng: "LPG",
};

function normalizeFuel(raw: string | null): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(FUEL_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw;
}

function normalizeTransmission(raw: string | null): string {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("manual")) return "Manual";
  if (lower.includes("cvt") || lower.includes("continuously")) return "CVT";
  if (lower.includes("semi") || lower.includes("dsg") || lower.includes("dct")) return "Semi-Auto";
  if (lower.includes("auto")) return "Automatic";
  return raw;
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NHTSA API error: ${res.status}`);
  const data = await res.json();

  const values: NhtsaValue[] = data.Results ?? [];
  const get = (variable: string) =>
    values.find((v) => v.Variable === variable)?.Value ?? null;

  const yearRaw = get("Model Year");
  const seatsRaw = get("Seat Rows") ?? get("Number of Seat Rows");
  const errorCode = get("Error Code");
  const errorText = get("Error Text");

  const result = {
    make: get("Make") ?? "",
    model: get("Model") ?? "",
    year: yearRaw ? parseInt(yearRaw, 10) : null,
    trim: get("Trim") ?? "",
    fuelType: normalizeFuel(get("Fuel Type - Primary")),
    transmission: normalizeTransmission(get("Transmission Style")),
    bodyClass: get("Body Class") ?? "",
    seats: seatsRaw ? parseInt(seatsRaw, 10) : null,
    engineDisplacement: get("Displacement (L)") ?? "",
  };

  const hasDecodedVehicleDetails =
    result.make ||
    result.model ||
    result.year ||
    result.trim ||
    result.fuelType ||
    result.transmission ||
    result.bodyClass ||
    result.seats ||
    result.engineDisplacement;

  if (!hasDecodedVehicleDetails) {
    throw new Error(
      errorCode && errorCode !== "0" && errorText
        ? errorText
        : "NHTSA did not return vehicle details for this VIN."
    );
  }

  return result;
}

/** Basic VIN format validation (17 chars, no I/O/Q, valid check digit) */
export function isValidVinFormat(vin: string): boolean {
  if (vin.length !== 17) return false;
  if (/[IOQ]/i.test(vin)) return false;
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
}
