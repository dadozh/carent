"use client";

import { useParams, useRouter } from "next/navigation";
import { VehicleForm, type VehicleFormData } from "@/components/fleet/vehicle-form";
import { uploadFiles } from "@/lib/storage";
import { useVehicles } from "@/lib/use-vehicles";
import { usePricingTemplates } from "@/lib/use-pricing-templates";
import type { VehicleCategory } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getVehicle, updateVehicle, isLoading } = useVehicles();
  const { templates } = usePricingTemplates();
  const { t } = useI18n();

  const vehicle = getVehicle(id);

  if (isLoading) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!vehicle) return <p className="p-6 text-muted-foreground">{t("fleet.notFound")}</p>;
  const existingVehicle = vehicle;

  async function handleSave(
    data: VehicleFormData,
    keptImages: string[],
    newFiles: File[],
  ) {
    // Upload any new photos; kept images are already stored URLs — no re-upload needed.
    const newUrls = newFiles.length > 0 ? await uploadFiles(newFiles) : [];
    const allImages = [...keptImages, ...newUrls];
    const primaryImage = allImages[0] ?? existingVehicle.image;

    // Only vehicle attributes are updated.
    // maintenanceLog and rentalHistory are intentionally excluded — they are
    // immutable history snapshots and must not be affected by editing specs/price.
    await updateVehicle(id, {
      make: data.make,
      model: data.model,
      trim: data.trim || undefined,
      year: Number(data.year),
      category: data.category as VehicleCategory,
      plate: data.plate,
      vin: data.vin || undefined,
      color: data.color,
      mileage: Number(data.mileage),
      dailyRate: Number(data.dailyRate),
      pricingTemplateId: data.pricingMode === "template" ? data.pricingTemplateId || null : null,
      customTiers: data.pricingMode === "custom" ? data.customTiers : [],
      status: data.status,
      location: data.location,
      fuelType: data.fuelType,
      transmission: data.transmission,
      seats: data.seats,
      luggageCount: data.luggageCount,
      image: primaryImage,
      images: allImages,
    });

    router.push(`/fleet/${id}`);
  }

  return (
    <VehicleForm
      vehicle={vehicle}
      pricingTemplates={templates}
      onSave={handleSave}
      onBack={() => router.push(`/fleet/${id}`)}
    />
  );
}
