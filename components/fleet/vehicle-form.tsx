"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeft, Loader2, Upload, X, Car, Zap, Fuel,
  Settings2, Users, Briefcase, MapPin, CircleDollarSign,
  Gauge, ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import { getMakes, getModels } from "@/lib/vehicle-data";
import { useI18n } from "@/lib/i18n";
import type { Vehicle, VehicleCategory, VehicleStatus } from "@/lib/mock-data";

// ─── Constants ────────────────────────────────────────────────────────────────

export const VEHICLE_CATEGORIES: { value: VehicleCategory; icon: string }[] = [
  { value: "compact", icon: "🚗" },
  { value: "sedan",   icon: "🚙" },
  { value: "suv",     icon: "🛻" },
  { value: "van",     icon: "🚐" },
  { value: "luxury",  icon: "🏎️" },
];

export const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Electric", "LPG"] as const;
export const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Semi-Auto"] as const;
export const COLORS = [
  "White", "Black", "Silver", "Gray", "Blue", "Red", "Green",
  "Yellow", "Orange", "Brown", "Beige", "Gold", "Purple", "Other",
] as const;
export const LOCATIONS = ["Airport", "Downtown", "Workshop", "Storage"] as const;
export const VEHICLE_STATUSES: VehicleStatus[] = ["available", "rented", "maintenance", "retired"];

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => ({
  value: String(CURRENT_YEAR - i),
}));

// ─── Form state ───────────────────────────────────────────────────────────────

export interface VehicleFormData {
  vin: string;
  make: string;
  model: string;
  trim: string;
  year: string;
  category: VehicleCategory | "";
  fuelType: string;
  transmission: string;
  seats: number;
  luggageCount: number;
  color: string;
  plate: string;
  mileage: string;
  dailyRate: string;
  location: string;
  status: VehicleStatus;
}

export function vehicleToFormData(v: Vehicle): VehicleFormData {
  return {
    vin: v.vin ?? "",
    make: v.make,
    model: v.model,
    trim: v.trim ?? "",
    year: String(v.year),
    category: v.category,
    fuelType: v.fuelType,
    transmission: v.transmission,
    seats: v.seats,
    luggageCount: v.luggageCount,
    color: v.color,
    plate: v.plate,
    mileage: String(v.mileage),
    dailyRate: String(v.dailyRate),
    location: v.location,
    status: v.status,
  };
}

const EMPTY_FORM: VehicleFormData = {
  vin: "", make: "", model: "", trim: "", year: "",
  category: "", fuelType: "", transmission: "",
  seats: 5, luggageCount: 2,
  color: "", plate: "", mileage: "0",
  dailyRate: "", location: "Airport", status: "available",
};

// ─── Helper components ────────────────────────────────────────────────────────

export function FormSection({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VehicleFormProps {
  /** If provided, form starts pre-filled (edit mode). If omitted, add mode. */
  vehicle?: Vehicle;
  onSave: (
    data: VehicleFormData,
    /** Images kept from the original vehicle (not removed by user) */
    keptImages: string[],
    /** Newly selected files to upload */
    newFiles: File[],
  ) => Promise<void>;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleForm({ vehicle, onSave, onBack }: VehicleFormProps) {
  const { t } = useI18n();
  const isEdit = !!vehicle;

  // Form state — pre-fill from vehicle in edit mode
  const [form, setForm] = useState<VehicleFormData>(
    vehicle ? vehicleToFormData(vehicle) : EMPTY_FORM
  );

  // Images: existing ones from vehicle + previews for new files
  const [keptImages, setKeptImages] = useState<string[]>((vehicle?.images ?? []).filter(Boolean));
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    <K extends keyof VehicleFormData>(key: K, val: VehicleFormData[K]) =>
      setForm((f) => ({ ...f, [key]: val })),
    []
  );

  function setMake(val: string) {
    setForm((f) => ({ ...f, make: val, model: f.make === val ? f.model : "" }));
  }

  // ─── Label helpers ──────────────────────────────────────────────────────────

  function getCategoryLabel(c: VehicleCategory) {
    const map: Record<VehicleCategory, string> = {
      compact: t("fleet.compact"), sedan: t("fleet.sedan"),
      suv: t("fleet.suv"), van: t("fleet.van"), luxury: t("fleet.luxury"),
    };
    return map[c];
  }

  function getFuelLabel(f: string) {
    const map: Record<string, string> = {
      Gasoline: t("vehicleForm.fuel.gasoline"), Diesel: t("vehicleForm.fuel.diesel"),
      Hybrid: t("vehicleForm.fuel.hybrid"), Electric: t("vehicleForm.fuel.electric"),
      LPG: t("vehicleForm.fuel.lpg"),
    };
    return map[f] ?? f;
  }

  function getTransmissionLabel(tr: string) {
    const map: Record<string, string> = {
      Automatic: t("vehicleForm.transmission.automatic"), Manual: t("vehicleForm.transmission.manual"),
      CVT: t("vehicleForm.transmission.cvt"), "Semi-Auto": t("vehicleForm.transmission.semiAuto"),
    };
    return map[tr] ?? tr;
  }

  function getLocationLabel(l: string) {
    const map: Record<string, string> = {
      Airport: t("public.airport"), Downtown: t("public.downtown"),
      Workshop: t("vehicleForm.location.workshop"), Storage: t("vehicleForm.location.storage"),
    };
    return map[l] ?? l;
  }

  function getColorLabel(c: string) {
    const map: Record<string, string> = {
      White: t("vehicleForm.color.white"), Black: t("vehicleForm.color.black"),
      Silver: t("vehicleForm.color.silver"), Gray: t("vehicleForm.color.gray"),
      Blue: t("vehicleForm.color.blue"), Red: t("vehicleForm.color.red"),
      Green: t("vehicleForm.color.green"), Yellow: t("vehicleForm.color.yellow"),
      Orange: t("vehicleForm.color.orange"), Brown: t("vehicleForm.color.brown"),
      Beige: t("vehicleForm.color.beige"), Gold: t("vehicleForm.color.gold"),
      Purple: t("vehicleForm.color.purple"), Other: t("vehicleForm.color.other"),
    };
    return map[c] ?? c;
  }

  // ─── Image handling ──────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    let loaded = 0;
    const previews: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        previews.push(reader.result as string);
        loaded++;
        if (loaded === files.length) {
          setNewPreviews((prev) => [...prev, ...previews]);
          setNewFiles((prev) => [...prev, ...files]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeKept(index: number) {
    setKeptImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNew(index: number) {
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Partial<Record<keyof VehicleFormData, string>> = {};
    if (!form.make) errs.make = t("vehicleForm.required");
    if (!form.model) errs.model = t("vehicleForm.required");
    if (!form.year) errs.year = t("vehicleForm.required");
    if (!form.category) errs.category = t("vehicleForm.required");
    if (!form.fuelType) errs.fuelType = t("vehicleForm.required");
    if (!form.transmission) errs.transmission = t("vehicleForm.required");
    if (!form.color) errs.color = t("vehicleForm.required");
    if (!form.plate.trim()) errs.plate = t("vehicleForm.required");
    if (!form.dailyRate || Number(form.dailyRate) <= 0) errs.dailyRate = t("vehicleForm.mustBePositive");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(
        { ...form, plate: form.plate.trim().toUpperCase() },
        keptImages,
        newFiles,
      );
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  // ─── Derived options ──────────────────────────────────────────────────────────

  const makeOptions = getMakes().map((m) => ({ value: m }));
  const modelOptions = form.make ? getModels(form.make).map((m) => ({ value: m })) : [];
  const allDisplayImages = [
    ...keptImages.map((url, i) => ({ url, isKept: true, index: i })),
    ...newPreviews.map((url, i) => ({ url, isKept: false, index: i })),
  ].filter(({ url }) => url.trim());

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {isEdit ? t("vehicleForm.editTitle") : t("vehicleForm.title")}
          </h1>
          {isEdit && (
            <p className="text-sm text-muted-foreground">
              {vehicle.make} {vehicle.model} · {vehicle.plate}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Vehicle identity */}
        <FormSection title={t("vehicleForm.vehicle")} icon={<Car className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label={t("catalog.make")} required />
              <SearchableSelect options={makeOptions} value={form.make} onChange={setMake}
                placeholder={t("vehicleForm.selectMake")} searchPlaceholder={t("vehicleForm.searchMakes")} allowCustom />
              {errors.make && <p className="mt-1 text-xs text-destructive">{errors.make}</p>}
            </div>
            <div>
              <FieldLabel label={t("catalog.modelLabel")} required />
              <SearchableSelect options={modelOptions} value={form.model} onChange={(v) => set("model", v)}
                placeholder={form.make ? t("vehicleForm.selectModel") : t("vehicleForm.chooseMakeFirst")}
                searchPlaceholder={t("vehicleForm.searchModels")} disabled={!form.make} allowCustom />
              {errors.model && <p className="mt-1 text-xs text-destructive">{errors.model}</p>}
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.year")} required />
              <SearchableSelect options={YEARS} value={form.year} onChange={(v) => set("year", v)}
                placeholder={t("vehicleForm.selectYear")} searchPlaceholder={t("catalog.typeYear")} />
              {errors.year && <p className="mt-1 text-xs text-destructive">{errors.year}</p>}
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.trimVariant")} />
              <Input value={form.trim} onChange={(e) => set("trim", e.target.value)}
                placeholder={t("vehicleForm.trimPlaceholder")} className="h-10" />
            </div>
          </div>
        </FormSection>

        {/* Category */}
        <FormSection title={t("vehicleForm.type")} icon={<Car className="h-4 w-4" />}>
          {errors.category && <p className="mb-2 text-xs text-destructive">{errors.category}</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {VEHICLE_CATEGORIES.map((cat) => (
              <button key={cat.value} type="button" onClick={() => set("category", cat.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-all",
                  form.category === cat.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                {getCategoryLabel(cat.value)}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Specs */}
        <FormSection title={t("vehicleForm.specs")} icon={<Settings2 className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label={t("vehicleForm.fuelType")} required />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FUEL_TYPES.map((f) => (
                  <button key={f} type="button" onClick={() => set("fuelType", f)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      form.fuelType === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                    )}
                  >
                    <Fuel className="h-3.5 w-3.5 shrink-0" />{getFuelLabel(f)}
                  </button>
                ))}
              </div>
              {errors.fuelType && <p className="mt-1 text-xs text-destructive">{errors.fuelType}</p>}
            </div>
            <div>
              <FieldLabel label={t("fleet.transmission")} required />
              <div className="grid grid-cols-2 gap-2">
                {TRANSMISSIONS.map((tr) => (
                  <button key={tr} type="button" onClick={() => set("transmission", tr)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      form.transmission === tr ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0" />{getTransmissionLabel(tr)}
                  </button>
                ))}
              </div>
              {errors.transmission && <p className="mt-1 text-xs text-destructive">{errors.transmission}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label={t("fleet.seats")} />
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Stepper value={form.seats} onChange={(v) => set("seats", v)} min={1} max={16} className="flex-1" />
              </div>
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.luggage")} />
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Stepper value={form.luggageCount} onChange={(v) => set("luggageCount", v)} min={0} max={20} className="flex-1" />
              </div>
            </div>
          </div>
          <div>
            <FieldLabel label={t("vehicleForm.color")} required />
            <SearchableSelect
              options={COLORS.map((c) => ({ value: c, label: getColorLabel(c) }))}
              value={form.color} onChange={(v) => set("color", v)}
              placeholder={t("vehicleForm.selectColor")} searchPlaceholder={t("vehicleForm.searchColor")} allowCustom />
            {errors.color && <p className="mt-1 text-xs text-destructive">{errors.color}</p>}
          </div>
        </FormSection>

        {/* Fleet details */}
        <FormSection title={t("vehicleForm.fleetDetails")} icon={<MapPin className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label={t("vehicleForm.licensePlate")} required />
              <Input value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())}
                placeholder="e.g. CA-123-RT" className="h-10 font-mono tracking-wider uppercase" />
              {errors.plate && <p className="mt-1 text-xs text-destructive">{errors.plate}</p>}
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.dailyRate")} required />
              <div className="relative">
                <CircleDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" min="0" step="0.01" value={form.dailyRate}
                  onChange={(e) => set("dailyRate", e.target.value)} placeholder="0.00" className="h-10 pl-9" />
              </div>
              {errors.dailyRate && <p className="mt-1 text-xs text-destructive">{errors.dailyRate}</p>}
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.currentMileage")} />
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" min="0" value={form.mileage}
                  onChange={(e) => set("mileage", e.target.value)} placeholder="0" className="h-10 pl-9" />
              </div>
            </div>
            <div>
              <FieldLabel label={t("fleet.location")} />
              <SearchableSelect
                options={LOCATIONS.map((l) => ({ value: l, label: getLocationLabel(l) }))}
                value={form.location} onChange={(v) => set("location", v)}
                placeholder={t("vehicleForm.selectLocation")} searchPlaceholder={t("vehicleForm.searchLocation")}
                searchThreshold={1} allowCustom />
            </div>
            <div>
              <FieldLabel label={t("vehicleForm.status")} />
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => set("status", s)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all text-center",
                      form.status === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                    )}
                  >
                    {t(`fleet.status.${s}` as const)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Photos */}
        <FormSection title={t("vehicleForm.photos")} icon={<ImagePlus className="h-4 w-4" />}>
          <p className="text-xs text-muted-foreground -mt-2">{t("vehicleForm.photosDesc")}</p>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <span className="font-medium">{t("vehicleForm.tapToAddPhotos")}</span>
            <span className="text-xs">JPG, PNG, WEBP</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

          {allDisplayImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {allDisplayImages.map(({ url, isKept, index }, displayIdx) => (
                <div key={`${isKept ? "k" : "n"}-${index}`} className="group relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <Image src={url} alt={`Photo ${displayIdx + 1}`} fill className="object-cover" unoptimized />
                  {displayIdx === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {t("vehicleForm.main")}
                    </span>
                  )}
                  <button type="button"
                    onClick={() => isKept ? removeKept(index) : removeNew(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            </div>
          )}
        </FormSection>

        {/* Submit bar */}
        <div className="sticky bottom-0 -mx-6 bg-background/95 backdrop-blur px-6 py-4 border-t border-border sm:static sm:mx-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:px-0 sm:py-0">
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack}
              className="flex-1 h-12 sm:flex-none sm:h-9 sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}
              className="flex-1 h-12 sm:flex-none sm:h-9 sm:w-auto sm:px-6">
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("vehicleForm.saving")}</>
                : isEdit ? t("vehicleForm.saveChanges") : t("vehicleForm.addToFleet")
              }
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
