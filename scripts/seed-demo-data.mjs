import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = process.env.CARENT_DB_PATH ?? path.join(DATA_DIR, "carent.sqlite");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TODAY = new Date("2026-04-07T12:00:00");
const START = addDays(TODAY, -730);

const vehicleModels = [
  ["Toyota", "Yaris", "1.5 Hybrid", "compact", 2022, "Hybrid", "Automatic", 5, 2, 36],
  ["Toyota", "Corolla", "2.0 Hybrid", "sedan", 2023, "Hybrid", "Automatic", 5, 3, 52],
  ["Skoda", "Fabia", "1.0 TSI", "compact", 2021, "Gasoline", "Manual", 5, 2, 32],
  ["Skoda", "Octavia", "2.0 TDI", "sedan", 2022, "Diesel", "Automatic", 5, 4, 48],
  ["Volkswagen", "Golf", "1.5 TSI", "compact", 2023, "Gasoline", "Manual", 5, 3, 45],
  ["Volkswagen", "Passat", "2.0 TDI", "sedan", 2021, "Diesel", "Automatic", 5, 4, 58],
  ["Renault", "Clio", "1.0 TCe", "compact", 2022, "Gasoline", "Manual", 5, 2, 31],
  ["Renault", "Megane", "1.5 dCi", "sedan", 2020, "Diesel", "Manual", 5, 3, 40],
  ["Peugeot", "208", "1.2 PureTech", "compact", 2023, "Gasoline", "Manual", 5, 2, 34],
  ["Peugeot", "3008", "1.5 BlueHDi", "suv", 2022, "Diesel", "Automatic", 5, 4, 67],
  ["Citroen", "C3", "1.2 PureTech", "compact", 2021, "Gasoline", "Manual", 5, 2, 30],
  ["Fiat", "500", "1.0 Hybrid", "compact", 2022, "Hybrid", "Manual", 4, 1, 29],
  ["Opel", "Corsa", "1.2", "compact", 2022, "Gasoline", "Manual", 5, 2, 33],
  ["Opel", "Astra", "1.6 CDTI", "sedan", 2020, "Diesel", "Manual", 5, 3, 39],
  ["Hyundai", "i20", "1.2", "compact", 2023, "Gasoline", "Manual", 5, 2, 35],
  ["Hyundai", "Tucson", "1.6 T-GDI", "suv", 2022, "Hybrid", "Automatic", 5, 4, 70],
  ["Kia", "Ceed", "1.4 T-GDI", "sedan", 2021, "Gasoline", "Manual", 5, 3, 43],
  ["Kia", "Sportage", "1.6 CRDi", "suv", 2022, "Diesel", "Automatic", 5, 4, 68],
  ["Dacia", "Sandero", "1.0 ECO-G", "compact", 2023, "LPG", "Manual", 5, 2, 28],
  ["Dacia", "Duster", "1.5 dCi", "suv", 2021, "Diesel", "Manual", 5, 4, 46],
  ["Ford", "Focus", "1.5 EcoBlue", "sedan", 2020, "Diesel", "Manual", 5, 3, 41],
  ["Ford", "Kuga", "2.0 EcoBlue", "suv", 2021, "Diesel", "Automatic", 5, 4, 62],
  ["BMW", "320d", "xDrive", "luxury", 2022, "Diesel", "Automatic", 5, 4, 95],
  ["BMW", "X1", "sDrive18d", "luxury", 2023, "Diesel", "Automatic", 5, 4, 105],
  ["Mercedes-Benz", "A 180", "Progressive", "luxury", 2022, "Gasoline", "Automatic", 5, 3, 90],
  ["Mercedes-Benz", "C 220d", "Avantgarde", "luxury", 2021, "Diesel", "Automatic", 5, 4, 115],
  ["Audi", "A3", "35 TFSI", "luxury", 2022, "Gasoline", "Automatic", 5, 3, 88],
  ["Audi", "Q3", "35 TDI", "luxury", 2023, "Diesel", "Automatic", 5, 4, 112],
  ["Nissan", "Qashqai", "1.3 DIG-T", "suv", 2021, "Gasoline", "Manual", 5, 4, 57],
  ["Seat", "Leon", "1.5 TSI", "sedan", 2022, "Gasoline", "Manual", 5, 3, 42],
  ["Cupra", "Formentor", "2.0 TSI", "suv", 2023, "Gasoline", "Automatic", 5, 4, 92],
  ["Volvo", "XC40", "B4", "luxury", 2022, "Hybrid", "Automatic", 5, 4, 118],
  ["Mazda", "CX-5", "2.2 Skyactiv-D", "suv", 2021, "Diesel", "Automatic", 5, 4, 64],
  ["Suzuki", "Vitara", "1.4 BoosterJet", "suv", 2022, "Hybrid", "Manual", 5, 3, 49],
  ["Tesla", "Model 3", "RWD", "luxury", 2023, "Electric", "Automatic", 5, 3, 120],
  ["Volkswagen", "Touran", "2.0 TDI", "van", 2020, "Diesel", "Automatic", 7, 4, 72],
  ["Citroen", "Berlingo", "1.5 BlueHDi", "van", 2021, "Diesel", "Manual", 5, 5, 54],
  ["Mercedes-Benz", "Vito", "Tourer", "van", 2020, "Diesel", "Automatic", 8, 6, 98],
  ["Renault", "Trafic", "Passenger", "van", 2021, "Diesel", "Manual", 9, 6, 86],
  ["Ford", "Transit Custom", "Kombi", "van", 2020, "Diesel", "Manual", 9, 6, 84],
];

const legacyVehicles = [
  ["Skoda", "Rapid", "1.6 TDI", "NS-148-LG"],
  ["Volkswagen", "Polo", "BG-228-RT"],
  ["Renault", "Scenic", "NS-391-AB"],
  ["Fiat", "Tipo", "SU-505-DE"],
  ["Opel", "Insignia", "KG-771-MN"],
  ["Peugeot", "508", "BG-884-PA"],
  ["Citroen", "C4", "NI-602-TT"],
  ["Nissan", "Micra", "NS-046-ZK"],
  ["Ford", "Fiesta", "BG-319-XP"],
  ["Dacia", "Logan", "KG-220-SS"],
  ["Hyundai", "i30", "NS-930-HY"],
  ["Kia", "Rio", "SU-118-KA"],
];

const firstNames = ["Milan", "Jelena", "Nikola", "Ana", "Marko", "Marija", "Stefan", "Ivana", "Petar", "Tijana", "Aleksandar", "Sara", "Luka", "Katarina", "Nemanja", "Sofija", "Vladimir", "Tamara", "Uros", "Milica"];
const lastNames = ["Jovanovic", "Petrovic", "Nikolic", "Ilic", "Stojanovic", "Pavlovic", "Markovic", "Popovic", "Djordjevic", "Kostic", "Simic", "Milosevic", "Ristic", "Savic", "Todorovic", "Lazic", "Zivkovic", "Matic", "Cvetkovic", "Mitrovic"];
const locations = ["Airport", "Downtown"];
const extras = ["GPS", "Wi-Fi", "Child Seat"];
const fuelLevels = ["empty", "quarter", "half", "three_quarter", "full"];
const swapReasonTypes = ["breakdown", "accident", "customer_request", "other"];
const cancellationReasons = ["breakdown", "accident", "other", "other", "other", "other"];
const maintenanceTypes = ["Zamena ulja", "Rotacija guma", "Pregled kočnica", "Zamena filtera vazduha", "Kompletan servis", "Izmena rashladne tečnosti", "Provera baterije"];

let seed = 424242;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function pick(values) {
  return values[Math.floor(random() * values.length)];
}

function chance(probability) {
  return random() < probability;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function timeAround(hour) {
  const minutes = [0, 15, 30, 45][Math.floor(random() * 4)];
  const adjustedHour = Math.max(7, Math.min(21, hour + Math.floor(random() * 3) - 1));
  return `${String(adjustedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function seasonalGapDays(date) {
  const month = date.getMonth() + 1;
  if ([6, 7, 8].includes(month)) return 1 + Math.floor(random() * 4);
  if ([5, 9, 12].includes(month)) return 2 + Math.floor(random() * 6);
  return 4 + Math.floor(random() * 10);
}

function rentalDurationDays(date) {
  const month = date.getMonth() + 1;
  if ([6, 7, 8].includes(month)) return 4 + Math.floor(random() * 10);
  if ([5, 9, 12].includes(month)) return 3 + Math.floor(random() * 8);
  return 2 + Math.floor(random() * 6);
}

function makePlate(index) {
  const city = ["BG", "NS", "NI", "KG", "SU"][index % 5];
  const letters = ["CA", "RT", "MX", "LA", "AV", "ZD", "BK", "TR"][index % 8];
  return `${city}-${String(100 + index * 17).slice(-3)}-${letters}`;
}

function makeMaintenanceLogEntry(date, mileage) {
  return {
    date: toIsoDate(date),
    mileage: mileage + Math.floor(random() * 500),
    type: pick(maintenanceTypes),
    cost: 50 + Math.floor(random() * 350),
    notes: chance(0.4) ? "Redovan servis." : "",
  };
}

function makeVehicle(index, model, status) {
  const [make, name, trim, category, year, fuelType, transmission, seats, luggageCount, dailyRate] = model;
  const mileageBase = (2026 - year) * 18000;
  const mileage = mileageBase + Math.floor(random() * 25000);

  // Generate 1–3 historical maintenance log entries.
  const maintenanceLog = [];
  const serviceCount = 1 + Math.floor(random() * 3);
  for (let i = 0; i < serviceCount; i++) {
    const daysAgo = 30 + Math.floor(random() * 500);
      maintenanceLog.push(makeMaintenanceLogEntry(addDays(TODAY, -daysAgo), mileage - daysAgo * 50));
  }
  maintenanceLog.sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: `demo_vehicle_${String(index + 1).padStart(3, "0")}`,
    make,
    model: name,
    trim,
    year,
    category,
    plate: makePlate(index + 1),
    vin: "",
    color: pick(["White", "Black", "Silver", "Gray", "Blue", "Red"]),
    mileage,
    dailyRate,
    status,
    location: pick(locations),
    fuelType,
    transmission,
    seats,
    luggageCount,
    image: "",
    images: [],
    lastService: toIsoDate(addDays(TODAY, -20 - Math.floor(random() * 110))),
    nextService: toIsoDate(addDays(TODAY, 20 + Math.floor(random() * 140))),
    maintenanceLog,
    rentalHistory: [],
  };
}

function makeCustomers(count) {
  return Array.from({ length: count }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    return {
      id: `demo_customer_${String(index + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@example.test`,
      phone: `+381 6${Math.floor(10000000 + random() * 89999999)}`,
      licenseNumber: `SRB${String(200000 + index * 37).padStart(6, "0")}`,
      licenseExpiry: toIsoDate(addDays(TODAY, 120 + Math.floor(random() * 1600))),
      verified: true,
      address: `${1 + (index % 90)} Demo Street, Belgrade`,
      totalRentals: 0,
      totalSpent: 0,
      images: [],
    };
  });
}

function makeReturnChecklist(vehicle, reservation, endDate) {
  const durationDays = Math.round((new Date(reservation.endDate) - new Date(reservation.startDate)) / MS_PER_DAY);
  const returnMileage = vehicle.mileage + Math.floor(durationDays * (80 + random() * 120));
  const hasDamage = chance(0.06);
  return {
    returnMileage,
    fuelLevel: pick(fuelLevels),
    hasDamage,
    ...(hasDamage && { damageDescription: pick(["Manja ogrebotina na braniku", "Udubljenje na vozačevim vratima", "Puklo retrovizorsko staklo", "Pukotina na vetrobranskom staklu"]) }),
    ...(hasDamage && chance(0.7) && { extraCharges: 50 + Math.floor(random() * 250) }),
    notes: chance(0.15) ? "Klijent vratio vozilo na vreme." : "",
    returnPhotos: [],
    completedAt: `${endDate}T${timeAround(10)}:00.000Z`,
  };
}

function makePayments(totalCost, completedAt) {
  // Most completed reservations are fully paid; some have partial or no payment.
  if (chance(0.12)) return []; // unpaid
  const paidAt = new Date(completedAt);
  paidAt.setHours(paidAt.getHours() + Math.floor(random() * 4));
  return [{
    paidAt: paidAt.toISOString(),
    method: "cash",
    amount: totalCost,
  }];
}

function makeReservation(idNumber, vehicle, customer, startDate, durationDays, status) {
  const endDate = addDays(startDate, durationDays);
  const selectedExtras = extras.filter(() => chance(0.22));
  const dailyRate = vehicle.dailyRate;
  const totalCost = dailyRate * durationDays + selectedExtras.length * 5 * durationDays;

  const res = {
    id: `demo_res_${String(idNumber).padStart(5, "0")}`,
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    vehiclePlate: vehicle.plate,
    startDate: toIsoDate(startDate),
    pickupTime: timeAround(9),
    endDate: toIsoDate(endDate),
    returnTime: timeAround(10),
    status,
    dailyRate,
    totalCost,
    extras: selectedExtras,
    pickupLocation: pick(locations),
    returnLocation: pick(locations),
    notes: chance(0.08) ? "Napomena o rezervaciji." : "",
    createdAt: toIsoDate(addDays(startDate, -Math.floor(1 + random() * 35))),
    images: [],
  };

  if (status === "completed") {
    res.returnChecklist = makeReturnChecklist(vehicle, res, toIsoDate(endDate));
    res.payments = makePayments(totalCost, res.returnChecklist.completedAt);

    // ~8% of completed reservations were extended during the rental.
    if (chance(0.08)) {
      const extensionDays = 1 + Math.floor(random() * 3);
      const origEnd = endDate;
      const newEnd = addDays(endDate, extensionDays);
      const additionalCost = extensionDays * dailyRate;
      res.extensions = [{
        previousEndDate: toIsoDate(origEnd),
        previousReturnTime: res.returnTime,
        newEndDate: toIsoDate(newEnd),
        newReturnTime: res.returnTime,
        additionalCost,
        extendedAt: `${toIsoDate(addDays(origEnd, -1))}T${timeAround(14)}:00.000Z`,
      }];
      res.endDate = toIsoDate(newEnd);
      res.totalCost = totalCost + additionalCost;
      res.returnChecklist.completedAt = `${toIsoDate(newEnd)}T${timeAround(10)}:00.000Z`;
    }
  }

  if (status === "cancelled") {
    if (chance(0.18)) {
      res.cancellationReason = pick(cancellationReasons);
    }
  }

  return res;
}

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  ensureTables(db);

  const currentVehicleStatuses = Array.from({ length: 40 }, (_, index) => {
    if (index < 4) return "rented";
    if (index >= 36 && index < 39) return "maintenance";
    if (index === 39) return "retired";
    return "available";
  });
  const vehicles = vehicleModels.map((model, index) => makeVehicle(index, model, currentVehicleStatuses[index]));
  const retiredVehicles = legacyVehicles.map(([make, model, trim, plate], index) => ({
    ...makeVehicle(100 + index, [make, model, trim, "sedan", 2018, "Diesel", "Manual", 5, 3, 30 + (index % 5) * 4], "retired"),
    id: `demo_legacy_vehicle_${String(index + 1).padStart(3, "0")}`,
    plate,
  }));
  const customers = makeCustomers(180);
  const reservations = [];
  let reservationId = 1;

  // Historical completed/cancelled reservations for all vehicles.
  for (const vehicle of [...vehicles, ...retiredVehicles]) {
    let cursor = addDays(START, Math.floor(random() * 12));
    const retireCutoff = vehicle.id.startsWith("demo_legacy")
      ? addDays(TODAY, -120 - Math.floor(random() * 420))
      : addDays(TODAY, -12);

    while (cursor < retireCutoff) {
      cursor = addDays(cursor, seasonalGapDays(cursor));
      const duration = rentalDurationDays(cursor);
      const end = addDays(cursor, duration);
      if (end > retireCutoff) break;

      const status = chance(0.075) ? "cancelled" : "completed";
      reservations.push(makeReservation(reservationId++, vehicle, pick(customers), cursor, duration, status));
      cursor = addDays(end, 1 + Math.floor(random() * 3));
    }
  }

  // Active rentals (currently rented vehicles). Two are overdue to exercise the overdue filter.
  for (let i = 0; i < 4; i++) {
    const vehicle = vehicles[i];
    const isOverdue = i < 2;
    const startDaysAgo = isOverdue
      ? 8 + Math.floor(random() * 4)   // started 8-12 days ago
      : 2 + Math.floor(random() * 3);  // started 2-4 days ago
    const durationDays = isOverdue
      ? 3 + Math.floor(random() * 3)   // end date is already past (overdue)
      : 5 + Math.floor(random() * 7);  // end date is still in the future

    const res = makeReservation(
      reservationId++,
      vehicle,
      pick(customers),
      addDays(TODAY, -startDaysAgo),
      durationDays,
      "active"
    );

    // One active rental has a vehicle swap in its history.
    if (i === 1) {
      const swapVehicle = vehicles[12]; // a spare available vehicle
      res.vehicleSwaps = [{
        fromVehicleId: `demo_vehicle_spare`,
        fromVehicleName: "Opel Corsa",
        fromVehiclePlate: makePlate(99),
        toVehicleId: vehicle.id,
        toVehicleName: res.vehicleName,
        toVehiclePlate: res.vehiclePlate,
        swappedAt: addDays(TODAY, -startDaysAgo + 1).toISOString(),
        reason: "Originalno vozilo se pokvarilo na auto-putu.",
        reasonType: "breakdown",
        fromVehicleCondition: "Kvar motora, odvezeno šleperom.",
      }];
    }

    // One active rental was extended.
    if (i === 2) {
      const origEndDate = toIsoDate(addDays(TODAY, durationDays - startDaysAgo - 2));
      const newEndDate = res.endDate;
      const extensionDays = 2;
      res.extensions = [{
        previousEndDate: origEndDate,
        previousReturnTime: res.returnTime,
        newEndDate,
        newReturnTime: res.returnTime,
        additionalCost: extensionDays * res.dailyRate,
        extendedAt: addDays(TODAY, -1).toISOString(),
      }];
    }

    reservations.push(res);
  }

  // Confirmed reservations (upcoming, approved).
  for (const vehicle of vehicles.slice(4, 12)) {
    reservations.push(
      makeReservation(
        reservationId++,
        vehicle,
        pick(customers),
        addDays(TODAY, -Math.floor(random() * 7)),
        3 + Math.floor(random() * 8),
        "confirmed"
      )
    );
  }

  // Pending reservations (public booking, awaiting confirmation).
  for (const vehicle of vehicles.slice(12, 17)) {
    const res = makeReservation(
      reservationId++,
      vehicle,
      pick(customers),
      addDays(TODAY, 2 + Math.floor(random() * 10)),
      2 + Math.floor(random() * 5),
      "pending"
    );
    res.notes = "Online rezervacija — čeka potvrdu.";
    reservations.push(res);
  }

  // Tally customer stats.
  const customerStats = new Map(customers.map((customer) => [customer.id, { totalRentals: 0, totalSpent: 0 }]));
  for (const reservation of reservations) {
    if (reservation.status === "cancelled") continue;
    const stats = customerStats.get(reservation.customerId);
    if (!stats) continue;
    stats.totalRentals += 1;
    stats.totalSpent += reservation.totalCost;
  }
  for (const customer of customers) {
    const stats = customerStats.get(customer.id);
    customer.totalRentals = stats.totalRentals;
    customer.totalSpent = stats.totalSpent;
  }

  const DEFAULT_TENANT_ID = "t_default";
  const insertVehicle = db.prepare("INSERT INTO vehicles (id, tenant_id, data) VALUES (?, ?, ?)");
  const insertCustomer = db.prepare("INSERT INTO customers (id, tenant_id, data) VALUES (?, ?, ?)");
  const insertReservation = db.prepare("INSERT INTO reservations (id, tenant_id, data) VALUES (?, ?, ?)");

  db.transaction(() => {
    db.prepare("DELETE FROM reservations WHERE id LIKE 'demo_%'").run();
    db.prepare("DELETE FROM customers WHERE id LIKE 'demo_%'").run();
    db.prepare("DELETE FROM vehicles WHERE id LIKE 'demo_%'").run();

    for (const vehicle of vehicles) insertVehicle.run(vehicle.id, DEFAULT_TENANT_ID, JSON.stringify(vehicle));
    for (const vehicle of retiredVehicles) insertVehicle.run(vehicle.id, DEFAULT_TENANT_ID, JSON.stringify(vehicle));
    for (const customer of customers) insertCustomer.run(customer.id, DEFAULT_TENANT_ID, JSON.stringify(customer));
    for (const reservation of reservations) insertReservation.run(reservation.id, DEFAULT_TENANT_ID, JSON.stringify(reservation));
  })();

  const pending = reservations.filter((r) => r.status === "pending").length;
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const active = reservations.filter((r) => r.status === "active").length;
  const overdue = reservations.filter((r) => r.status === "active" && r.endDate < toIsoDate(TODAY)).length;
  const completed = reservations.filter((r) => r.status === "completed").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled").length;
  const withChecklist = reservations.filter((r) => r.returnChecklist).length;
  const withPayment = reservations.filter((r) => r.payments?.length > 0).length;
  const withSwap = reservations.filter((r) => r.vehicleSwaps?.length > 0).length;
  const withExtension = reservations.filter((r) => r.extensions?.length > 0).length;
  const withCancellationReason = reservations.filter((r) => r.cancellationReason).length;

  console.log(`Seeded ${vehicles.length} current demo vehicles (${retiredVehicles.length} retired legacy).`);
  console.log(`Seeded ${customers.length} demo customers.`);
  console.log(`Seeded ${reservations.length} demo reservations:`);
  console.log(`  pending: ${pending}, confirmed: ${confirmed}, active: ${active} (${overdue} overdue), completed: ${completed}, cancelled: ${cancelled}`);
  console.log(`  with return checklist: ${withChecklist}, paid: ${withPayment}, with swap: ${withSwap}, extended: ${withExtension}, with cancellation reason: ${withCancellationReason}`);
  console.log("Existing non-demo data was preserved.");

  db.close();
}

main();
