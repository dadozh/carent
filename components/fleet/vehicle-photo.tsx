"use client";

import Image from "next/image";
import { Car } from "lucide-react";

interface VehiclePhotoProps {
  image?: string | null;
  images?: Array<string | null | undefined>;
  alt: string;
  iconClassName?: string;
}

function getPhotoSrc(image?: string | null, images?: Array<string | null | undefined>) {
  return [image, ...(images ?? [])].find((value) => value?.trim())?.trim() ?? null;
}

export function VehiclePhoto({ image, images, alt, iconClassName = "h-8 w-8" }: VehiclePhotoProps) {
  const src = getPhotoSrc(image, images);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <Car className={iconClassName} aria-hidden="true" />
      </div>
    );
  }

  return <Image src={src} alt={alt} fill className="object-cover" unoptimized />;
}
