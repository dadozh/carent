"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Show search input only when options exceed this count (default 8) */
  searchThreshold?: number;
  className?: string;
  /** Allow free-text values not in the list */
  allowCustom?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  searchThreshold = 8,
  className,
  allowCustom = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? selected?.value ?? value;

  const filtered = query
    ? options.filter((o) =>
        (o.label ?? o.value).toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
  }

  const showSearch = options.length >= searchThreshold;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-left transition-colors",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-3 ring-ring/50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value ? label : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg",
            "max-h-64 overflow-hidden flex flex-col"
          )}
        >
          {/* Search input */}
          {showSearch && (
            <div className="relative border-b border-border p-2">
              <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md bg-muted/40 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Options list */}
          <div className="overflow-y-auto overscroll-contain">
            {allowCustom && query && !options.find((o) => o.value.toLowerCase() === query.toLowerCase()) && (
              <button
                type="button"
                onClick={() => select(query)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm italic text-muted-foreground hover:bg-muted/60"
              >
                Add &ldquo;{query}&rdquo;
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results
              </div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm text-left",
                  "hover:bg-muted/60 active:bg-muted",
                  opt.value === value && "bg-primary/8 font-medium text-primary"
                )}
              >
                <span className="truncate">{opt.label ?? opt.value}</span>
                {opt.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
