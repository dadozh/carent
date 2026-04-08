import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
