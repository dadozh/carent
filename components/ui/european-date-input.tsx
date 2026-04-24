"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EuropeanDateInputProps {
  displayValue: string;
  isoValue: string;
  onDisplayChange: (value: string) => void;
  onIsoChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function EuropeanDateInput({
  displayValue,
  isoValue,
  onDisplayChange,
  onIsoChange,
  placeholder = "dd.mm.yyyy",
  ariaLabel,
}: EuropeanDateInputProps) {
  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={displayValue}
        onChange={(event) => onDisplayChange(event.target.value)}
        className="pr-10"
      />
      <div
        className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground"
        aria-hidden="true"
      >
        <Calendar className="h-4 w-4" />
      </div>
      <input
        type="date"
        value={isoValue}
        onChange={(event) => onIsoChange(event.target.value)}
        aria-label={ariaLabel ? `${ariaLabel} (calendar)` : "Open calendar"}
        className="absolute right-0 top-0 h-full w-10 cursor-pointer opacity-0"
      />
    </div>
  );
}
