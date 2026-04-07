"use client";

import { useRouter } from "next/navigation";
import { VehicleForm, type VehicleFormData } from "@/components/fleet/vehicle-form";
import { uploadFiles } from "@/lib/storage";
import { useVehicles } from "@/lib/use-vehicles";
import type { VehicleCategory } from "@/lib/mock-data";

export default function AddVehiclePage() {
  const router = useRouter();
  const { addVehicle } = useVehicles();

  async function handleSave(
    data: VehicleFormData,
    _keptImages: string[],
    newFiles: File[],
  ) {
    const imageUrls = newFiles.length > 0 ? await uploadFiles(newFiles) : [];
    const primaryImage = imageUrls[0] ?? "";

    await addVehicle({
      make: data.make,
      model: data.model,
      trim: data.trim || undefined,
      year: Number(data.year),
      category: data.category as VehicleCategory,
      plate: data.plate,
      vin: data.vin || undefined,
      color: data.color,
      mileage: Number(data.mileage) || 0,
      dailyRate: Number(data.dailyRate),
      status: data.status,
      location: data.location,
      fuelType: data.fuelType,
      transmission: data.transmission,
      seats: data.seats,
      luggageCount: data.luggageCount,
      image: primaryImage,
      images: imageUrls,
      lastService: "-",
      nextService: "-",
    });

    router.push("/fleet");
  }

  return (
    <VehicleForm
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
