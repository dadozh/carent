# Vehicle Management

## Adding a vehicle

Navigate to **Fleet → Add vehicle** (`/fleet/new`) or tap the **+** button on the fleet list.

The form is split into sections:

| Section | Fields |
|---|---|
| VIN lookup | VIN (optional, auto-fills below) |
| Vehicle | Make, Model, Year, Trim/Variant |
| Type | Category picker (Compact / Sedan / SUV / Van / Luxury) |
| Specs | Fuel, Transmission, Seats, Luggage bags, Color |
| Fleet details | Plate, Daily rate, Mileage, Location, Status |
| Photos | Upload multiple images |

**Required fields:** Make, Model, Year, Category, Fuel, Transmission, Color, Plate, Daily rate.

### VIN auto-fill

Enter a 17-character VIN and tap **Decode**. Uses the [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) (free, no API key). Auto-fills Make, Model, Year, Trim, Fuel, Transmission, Body class → Category. If the decoded make/model is not in the built-in dataset it is automatically added to the custom catalog.

### Make / Model autocomplete

- Sourced from the `arthurkao/vehicle-make-model-data` dataset (US-market, 2001–2016) + a bundled European supplement (Škoda, Opel, Citroën, Dacia, Cupra, Polestar, BYD, Lancia, …) + any custom entries you've added in the catalog.
- All combos are extended to the current year automatically.
- Both fields accept free text — type a value not in the list and select **Add "…"** to use it. The new make/model is saved to the custom catalog for future use.

---

## Editing a vehicle

Open a vehicle from the fleet list, then tap **Edit** (pencil icon, top-right of the detail page). This opens `/fleet/[id]/edit` — the same form, pre-filled.

**What changes:** all vehicle attributes (make, model, specs, price, status, photos, …).

**What never changes via editing:** `maintenanceLog` and `rentalHistory`. These are append-only history records written at the time of each event. Changing the daily rate today does not retroactively alter the revenue recorded on past rentals — each rental entry stores the actual amount earned at booking time.

---

## Vehicle Catalog

**Fleet → Vehicle Catalog** (`/fleet/catalog`) — manage makes and models that appear in the autocomplete.

### Built-in data

- `lib/data/vehicle-makes-models.json` — processed from the arthurkao dataset; 74 car/van makes, ~1,670 models, years 2001 → current.
- `lib/vehicle-data.ts` (`EUROPEAN_SUPPLEMENT`) — brands absent from the US dataset, bundled directly in code: Škoda, Opel, Citroën, Dacia, Cupra, Polestar, BYD, Lancia.

You cannot delete built-in entries — only add custom ones on top.

### Adding a custom model

1. Select or type a **Make** (can be a new brand).
2. Enter the **Model** name.
3. Set a **From / To year** range — all years in the range are added at once.
4. Tap **Add to catalog**.

Custom entries are stored in `localStorage` under the key `carent:vehicle-catalog` and merged with the built-in dataset at runtime.

### Removing a custom model

Expand the make row and tap the trash icon next to the model. The entire model (all its years) is removed. Built-in models cannot be removed here.

---

## Photo storage

Photos are currently stored as **data URLs** (base64) via `lib/storage.ts` → `LocalProvider`. This works for development but fills `localStorage` quickly with real images.

To switch to a cloud provider, implement the `StorageProvider` interface and replace the `storage` export in `lib/storage.ts`:

```typescript
// lib/storage.ts
export interface StorageProvider {
  upload(file: File, path: string): Promise<string>; // returns public URL
  remove(url: string): Promise<void>;
}

// Vercel Blob example:
import { put, del } from "@vercel/blob";
class VercelBlobProvider implements StorageProvider {
  async upload(file, path) {
    const blob = await put(path, file, { access: "public" });
    return blob.url;
  }
  async remove(url) { await del(url); }
}
export const storage: StorageProvider = new VercelBlobProvider();
```

Same pattern applies for AWS S3 (`PutObjectCommand`) or Azure Blob (`BlobServiceClient`).

---

## Key files

| File | Purpose |
|---|---|
| `lib/data/vehicle-makes-models.json` | Processed base dataset (67 KB) |
| `lib/vehicle-data.ts` | Dataset queries + European supplement + custom catalog CRUD |
| `lib/use-vehicles.ts` | `useVehicles()` hook — localStorage-backed vehicle store |
| `lib/storage.ts` | Photo storage abstraction |
| `lib/vin-decode.ts` | NHTSA VIN decode |
| `components/fleet/vehicle-form.tsx` | Shared add/edit form component |
| `components/ui/searchable-select.tsx` | Searchable dropdown with free-text support |
| `components/ui/stepper.tsx` | +/− stepper for seats and luggage count |
| `app/(admin)/fleet/new/page.tsx` | Add vehicle page |
| `app/(admin)/fleet/[id]/edit/page.tsx` | Edit vehicle page |
| `app/(admin)/fleet/catalog/page.tsx` | Custom catalog management |
