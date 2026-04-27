"use client";

import { useRef } from "react";
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
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
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
        aria-label={ariaLabel ? `${ariaLabel} (calendar)` : "Open calendar"}
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={isoValue}
        onChange={(event) => onIsoChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-0 w-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
