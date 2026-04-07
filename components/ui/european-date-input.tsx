"use client";

import { Calendar } from "lucide-react";
import { useRef } from "react";
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
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;

    const datePicker = picker as HTMLInputElement & { showPicker?: () => void };
    if (datePicker.showPicker) {
      datePicker.showPicker();
      return;
    }

    datePicker.click();
  }

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
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Open calendar"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={isoValue}
        onChange={(event) => onIsoChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
