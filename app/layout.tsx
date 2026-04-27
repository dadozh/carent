import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY, getInitialLocale } from "@/lib/i18n-config";

const plusJakarta = localFont({
  variable: "--font-geist-sans",
  src: [
    { path: "./fonts/PlusJakartaSans-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/PlusJakartaSans-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/PlusJakartaSans-700.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const jetbrainsMono = localFont({
  variable: "--font-geist-mono",
  src: [
    { path: "./fonts/JetBrainsMono-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/JetBrainsMono-500.ttf", weight: "500", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CARENT - Fleet & Rental Management",
  description: "Rent-a-car management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = getInitialLocale(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return (
    <html
      lang={initialLocale}
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body>
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
