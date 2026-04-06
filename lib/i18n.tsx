"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "sr";

const translations = {
  en: {
    // Common
    "common.search": "Search",
    "common.filter": "Filter",
    "common.all": "All",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.confirm": "Confirm",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.day": "day",
    "common.days": "days",
    "common.perDay": "/day",
    "common.total": "Total",
    "common.none": "None",
    "common.noResults": "No results found.",
    "common.language": "Language",
    "common.english": "English",
    "common.serbian": "Serbian",

    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.fleet": "Fleet",
    "nav.reservations": "Reservations",
    "nav.bookNow": "Book Now",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome back. Here's your fleet overview.",
    "dashboard.totalVehicles": "Total Vehicles",
    "dashboard.activeRentals": "Active Rentals",
    "dashboard.fleetUtilization": "Fleet Utilization",
    "dashboard.inMaintenance": "In Maintenance",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.newBooking": "New Booking",
    "dashboard.viewFleet": "View Fleet",
    "dashboard.recentBookings": "Recent Bookings",

    // Fleet
    "fleet.title": "Fleet Management",
    "fleet.vehicles": "vehicles",
    "fleet.available": "available",
    "fleet.searchPlaceholder": "Search make, model, plate...",
    "fleet.allTypes": "All Types",
    "fleet.compact": "Compact",
    "fleet.sedan": "Sedan",
    "fleet.suv": "SUV",
    "fleet.van": "Van",
    "fleet.luxury": "Luxury",
    "fleet.status.available": "Available",
    "fleet.status.rented": "Rented",
    "fleet.status.maintenance": "Maintenance",
    "fleet.status.retired": "Retired",
    "fleet.backToFleet": "Back to Fleet",
    "fleet.maintenanceLog": "Maintenance Log",
    "fleet.noMaintenance": "No maintenance records.",
    "fleet.serviceSchedule": "Service Schedule",
    "fleet.lastService": "Last Service",
    "fleet.nextService": "Next Service",
    "fleet.rentalHistory": "Rental History",
    "fleet.noRentals": "No rental history.",
    "fleet.fuelType": "Fuel Type",
    "fleet.transmission": "Transmission",
    "fleet.seats": "Seats",
    "fleet.mileage": "Mileage",
    "fleet.location": "Location",
    "fleet.category": "Category",
    "fleet.noVehicles": "No vehicles match your filters.",

    // Reservations
    "res.title": "Reservations",
    "res.total": "total",
    "res.active": "active",
    "res.searchPlaceholder": "Search bookings...",
    "res.newBooking": "New Booking",
    "res.bookingDetails": "Booking Details",
    "res.customer": "Customer",
    "res.vehicle": "Vehicle",
    "res.rentalPeriod": "Rental Period",
    "res.locations": "Locations",
    "res.extras": "Extras",
    "res.dailyRate": "Daily Rate",
    "res.notes": "Notes",
    "res.created": "Created",
    "res.selectBooking": "Select a booking to view details, or create a new one.",
    "res.noBookings": "No bookings found.",
    "res.status.pending": "Pending",
    "res.status.confirmed": "Confirmed",
    "res.status.active": "Active",
    "res.status.completed": "Completed",
    "res.status.cancelled": "Cancelled",

    // Booking form
    "booking.datesLocation": "Dates & Location",
    "booking.selectVehicle": "Select Vehicle",
    "booking.customer": "Customer",
    "booking.extras": "Extras",
    "booking.summary": "Summary",
    "booking.pickupDate": "Pick-up Date",
    "booking.returnDate": "Return Date",
    "booking.pickupLocation": "Pick-up Location",
    "booking.returnLocation": "Return Location",
    "booking.duration": "Duration",
    "booking.pickup": "Pick-up",
    "booking.return": "Return",
    "booking.confirmBooking": "Confirm Booking",
    "booking.gps": "GPS",
    "booking.wifi": "Wi-Fi",
    "booking.childSeat": "Child Seat",
    "booking.verified": "Verified",

    // Public booking
    "public.hero": "Find Your Perfect Ride",
    "public.heroSub": "Choose from our premium fleet of vehicles. Easy booking, competitive prices, reliable service.",
    "public.pickupDate": "Pick-up Date",
    "public.returnDate": "Return Date",
    "public.location": "Location",
    "public.vehicleType": "Vehicle Type",
    "public.searchVehicles": "Search Vehicles",
    "public.availableVehicles": "Available Vehicles",
    "public.bookThisVehicle": "Book This Vehicle",
    "public.yourDetails": "Your Details",
    "public.firstName": "First Name",
    "public.lastName": "Last Name",
    "public.email": "Email",
    "public.phone": "Phone",
    "public.licenseNumber": "Driver License Number",
    "public.bookingSummary": "Booking Summary",
    "public.completeBooking": "Complete Booking",
    "public.bookingConfirmed": "Booking Confirmed!",
    "public.confirmationMsg": "Thank you for choosing CARENT. You will receive a confirmation email shortly.",
    "public.bookingRef": "Booking Reference",
    "public.backToHome": "Back to Home",
    "public.whyChoose": "Why Choose CARENT?",
    "public.benefit1Title": "Premium Fleet",
    "public.benefit1Desc": "Modern, well-maintained vehicles from top brands.",
    "public.benefit2Title": "Best Prices",
    "public.benefit2Desc": "Competitive daily rates with no hidden fees.",
    "public.benefit3Title": "24/7 Support",
    "public.benefit3Desc": "Round-the-clock customer support and roadside assistance.",
    "public.allLocations": "All Locations",
    "public.airport": "Airport",
    "public.downtown": "Downtown",
    "public.allTypes": "All Types",
    "public.noVehicles": "No vehicles available for your criteria. Try different dates or filters.",
    "public.steps.search": "Search",
    "public.steps.select": "Select",
    "public.steps.details": "Details",
    "public.steps.confirm": "Confirm",
  },
  sr: {
    // Common
    "common.search": "Pretraga",
    "common.filter": "Filter",
    "common.all": "Sve",
    "common.close": "Zatvori",
    "common.back": "Nazad",
    "common.next": "Dalje",
    "common.confirm": "Potvrdi",
    "common.cancel": "Otkaži",
    "common.save": "Sačuvaj",
    "common.day": "dan",
    "common.days": "dana",
    "common.perDay": "/dan",
    "common.total": "Ukupno",
    "common.none": "Nema",
    "common.noResults": "Nema rezultata.",
    "common.language": "Jezik",
    "common.english": "Engleski",
    "common.serbian": "Srpski",

    // Navigation
    "nav.dashboard": "Kontrolna tabla",
    "nav.fleet": "Vozni park",
    "nav.reservations": "Rezervacije",
    "nav.bookNow": "Rezerviši",

    // Dashboard
    "dashboard.title": "Kontrolna tabla",
    "dashboard.welcome": "Dobrodošli. Evo pregleda vašeg voznog parka.",
    "dashboard.totalVehicles": "Ukupno vozila",
    "dashboard.activeRentals": "Aktivni najam",
    "dashboard.fleetUtilization": "Iskorišćenost",
    "dashboard.inMaintenance": "Na servisu",
    "dashboard.quickActions": "Brze akcije",
    "dashboard.newBooking": "Nova rezervacija",
    "dashboard.viewFleet": "Vozni park",
    "dashboard.recentBookings": "Poslednje rezervacije",

    // Fleet
    "fleet.title": "Upravljanje voznim parkom",
    "fleet.vehicles": "vozila",
    "fleet.available": "dostupno",
    "fleet.searchPlaceholder": "Pretraži marku, model, tablice...",
    "fleet.allTypes": "Svi tipovi",
    "fleet.compact": "Kompakt",
    "fleet.sedan": "Sedan",
    "fleet.suv": "SUV",
    "fleet.van": "Kombi",
    "fleet.luxury": "Luksuz",
    "fleet.status.available": "Dostupno",
    "fleet.status.rented": "Iznajmljeno",
    "fleet.status.maintenance": "Servis",
    "fleet.status.retired": "Povučeno",
    "fleet.backToFleet": "Nazad na vozni park",
    "fleet.maintenanceLog": "Istorija servisa",
    "fleet.noMaintenance": "Nema zapisa o servisu.",
    "fleet.serviceSchedule": "Raspored servisa",
    "fleet.lastService": "Poslednji servis",
    "fleet.nextService": "Sledeći servis",
    "fleet.rentalHistory": "Istorija iznajmljivanja",
    "fleet.noRentals": "Nema istorije iznajmljivanja.",
    "fleet.fuelType": "Gorivo",
    "fleet.transmission": "Menjač",
    "fleet.seats": "Sedišta",
    "fleet.mileage": "Kilometraža",
    "fleet.location": "Lokacija",
    "fleet.category": "Kategorija",
    "fleet.noVehicles": "Nema vozila koja odgovaraju filterima.",

    // Reservations
    "res.title": "Rezervacije",
    "res.total": "ukupno",
    "res.active": "aktivno",
    "res.searchPlaceholder": "Pretraži rezervacije...",
    "res.newBooking": "Nova rezervacija",
    "res.bookingDetails": "Detalji rezervacije",
    "res.customer": "Klijent",
    "res.vehicle": "Vozilo",
    "res.rentalPeriod": "Period najma",
    "res.locations": "Lokacije",
    "res.extras": "Dodaci",
    "res.dailyRate": "Dnevna cena",
    "res.notes": "Napomene",
    "res.created": "Kreirano",
    "res.selectBooking": "Izaberite rezervaciju za prikaz detalja ili kreirajte novu.",
    "res.noBookings": "Nema pronađenih rezervacija.",
    "res.status.pending": "Na čekanju",
    "res.status.confirmed": "Potvrđeno",
    "res.status.active": "Aktivno",
    "res.status.completed": "Završeno",
    "res.status.cancelled": "Otkazano",

    // Booking form
    "booking.datesLocation": "Datumi i lokacija",
    "booking.selectVehicle": "Izaberite vozilo",
    "booking.customer": "Klijent",
    "booking.extras": "Dodaci",
    "booking.summary": "Pregled",
    "booking.pickupDate": "Datum preuzimanja",
    "booking.returnDate": "Datum vraćanja",
    "booking.pickupLocation": "Mesto preuzimanja",
    "booking.returnLocation": "Mesto vraćanja",
    "booking.duration": "Trajanje",
    "booking.pickup": "Preuzimanje",
    "booking.return": "Vraćanje",
    "booking.confirmBooking": "Potvrdi rezervaciju",
    "booking.gps": "GPS",
    "booking.wifi": "Wi-Fi",
    "booking.childSeat": "Dečje sedište",
    "booking.verified": "Verifikovan",

    // Public booking
    "public.hero": "Pronađite savršeno vozilo",
    "public.heroSub": "Izaberite iz našeg premium voznog parka. Laka rezervacija, konkurentne cene, pouzdana usluga.",
    "public.pickupDate": "Datum preuzimanja",
    "public.returnDate": "Datum vraćanja",
    "public.location": "Lokacija",
    "public.vehicleType": "Tip vozila",
    "public.searchVehicles": "Pretraži vozila",
    "public.availableVehicles": "Dostupna vozila",
    "public.bookThisVehicle": "Rezerviši ovo vozilo",
    "public.yourDetails": "Vaši podaci",
    "public.firstName": "Ime",
    "public.lastName": "Prezime",
    "public.email": "Email",
    "public.phone": "Telefon",
    "public.licenseNumber": "Broj vozačke dozvole",
    "public.bookingSummary": "Pregled rezervacije",
    "public.completeBooking": "Završi rezervaciju",
    "public.bookingConfirmed": "Rezervacija potvrđena!",
    "public.confirmationMsg": "Hvala što ste izabrali CARENT. Uskoro ćete dobiti email potvrdu.",
    "public.bookingRef": "Referenca rezervacije",
    "public.backToHome": "Nazad na početnu",
    "public.whyChoose": "Zašto CARENT?",
    "public.benefit1Title": "Premium vozni park",
    "public.benefit1Desc": "Moderna, održavana vozila vodećih brendova.",
    "public.benefit2Title": "Najbolje cene",
    "public.benefit2Desc": "Konkurentne dnevne cene bez skrivenih troškova.",
    "public.benefit3Title": "24/7 Podrška",
    "public.benefit3Desc": "Non-stop korisnička podrška i pomoć na putu.",
    "public.allLocations": "Sve lokacije",
    "public.airport": "Aerodrom",
    "public.downtown": "Centar grada",
    "public.allTypes": "Svi tipovi",
    "public.noVehicles": "Nema dostupnih vozila za vaše kriterijume. Pokušajte sa drugim datumima ili filterima.",
    "public.steps.search": "Pretraga",
    "public.steps.select": "Izbor",
    "public.steps.details": "Podaci",
    "public.steps.confirm": "Potvrda",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[locale][key] || translations.en[key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
