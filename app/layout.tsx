import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
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
