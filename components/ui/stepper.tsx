"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled = false,
  className,
}: StepperProps) {
  function decrement() {
    if (value > min) onChange(value - 1);
  }
  function increment() {
    if (value < max) onChange(value + 1);
  }

  return (
    <div className={cn("flex items-center gap-0 rounded-lg border border-input overflow-hidden", className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        aria-label="Decrease"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-10 flex-1 items-center justify-center text-sm font-semibold tabular-nums select-none">
        {value}
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        aria-label="Increase"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
