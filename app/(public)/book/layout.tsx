"use client";

import Link from "next/link";
import { Car, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/book" className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">CARENT</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocale(locale === "en" ? "sr" : "en")}
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === "en" ? "EN" : "SR"}
            </button>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          &copy; 2026 CARENT. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
