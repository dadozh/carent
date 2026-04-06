export type VehicleStatus = "available" | "rented" | "maintenance" | "retired";
export type VehicleCategory = "compact" | "sedan" | "suv" | "van" | "luxury";
export type ReservationStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  plate: string;
  color: string;
  mileage: number;
  dailyRate: number;
  status: VehicleStatus;
  location: string;
  fuelType: string;
  transmission: string;
  seats: number;
  image: string;
  lastService: string;
  nextService: string;
  maintenanceLog: { date: string; type: string; cost: number; notes: string }[];
  rentalHistory: { customerId: string; startDate: string; endDate: string; revenue: number }[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  verified: boolean;
  address: string;
  totalRentals: number;
  totalSpent: number;
}

export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  dailyRate: number;
  totalCost: number;
  extras: string[];
  pickupLocation: string;
  returnLocation: string;
  notes: string;
  createdAt: string;
}

const vehicleImages: Record<VehicleCategory, string> = {
  compact: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=250&fit=crop",
  sedan: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=400&h=250&fit=crop",
  suv: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&h=250&fit=crop",
  van: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=250&fit=crop",
  luxury: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop",
};

export const vehicles: Vehicle[] = [
  {
    id: "v1", make: "Toyota", model: "Yaris", year: 2024, category: "compact",
    plate: "CA-101-RT", color: "White", mileage: 12400, dailyRate: 35,
    status: "available", location: "Airport", fuelType: "Hybrid", transmission: "Automatic", seats: 5,
    image: vehicleImages.compact,
    lastService: "2026-03-15", nextService: "2026-06-15",
    maintenanceLog: [
      { date: "2026-03-15", type: "Oil Change", cost: 85, notes: "Regular service" },
      { date: "2026-01-10", type: "Tire Rotation", cost: 60, notes: "Front tires swapped" },
    ],
    rentalHistory: [
      { customerId: "c1", startDate: "2026-03-20", endDate: "2026-03-25", revenue: 175 },
    ],
  },
  {
    id: "v2", make: "Volkswagen", model: "Golf", year: 2024, category: "compact",
    plate: "CA-102-RT", color: "Blue", mileage: 18200, dailyRate: 38,
    status: "rented", location: "Downtown", fuelType: "Gasoline", transmission: "Manual", seats: 5,
    image: vehicleImages.compact,
    lastService: "2026-02-20", nextService: "2026-05-20",
    maintenanceLog: [
      { date: "2026-02-20", type: "Brake Pads", cost: 220, notes: "Front pads replaced" },
    ],
    rentalHistory: [
      { customerId: "c2", startDate: "2026-04-01", endDate: "2026-04-08", revenue: 266 },
    ],
  },
  {
    id: "v3", make: "BMW", model: "3 Series", year: 2025, category: "sedan",
    plate: "CA-201-RT", color: "Black", mileage: 5600, dailyRate: 75,
    status: "available", location: "Airport", fuelType: "Diesel", transmission: "Automatic", seats: 5,
    image: vehicleImages.sedan,
    lastService: "2026-03-01", nextService: "2026-06-01",
    maintenanceLog: [
      { date: "2026-03-01", type: "Full Service", cost: 350, notes: "15,000km service" },
    ],
    rentalHistory: [
      { customerId: "c3", startDate: "2026-03-10", endDate: "2026-03-14", revenue: 300 },
      { customerId: "c5", startDate: "2026-02-15", endDate: "2026-02-20", revenue: 375 },
    ],
  },
  {
    id: "v4", make: "Mercedes-Benz", model: "C-Class", year: 2025, category: "sedan",
    plate: "CA-202-RT", color: "Silver", mileage: 8900, dailyRate: 85,
    status: "rented", location: "Downtown", fuelType: "Hybrid", transmission: "Automatic", seats: 5,
    image: vehicleImages.sedan,
    lastService: "2026-02-10", nextService: "2026-05-10",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c4", startDate: "2026-04-02", endDate: "2026-04-09", revenue: 595 },
    ],
  },
  {
    id: "v5", make: "Audi", model: "A4", year: 2024, category: "sedan",
    plate: "CA-203-RT", color: "Gray", mileage: 22100, dailyRate: 70,
    status: "maintenance", location: "Workshop", fuelType: "Diesel", transmission: "Automatic", seats: 5,
    image: vehicleImages.sedan,
    lastService: "2026-04-01", nextService: "2026-04-05",
    maintenanceLog: [
      { date: "2026-04-01", type: "AC Repair", cost: 480, notes: "Compressor replacement in progress" },
    ],
    rentalHistory: [],
  },
  {
    id: "v6", make: "Toyota", model: "RAV4", year: 2025, category: "suv",
    plate: "CA-301-RT", color: "Red", mileage: 9800, dailyRate: 65,
    status: "available", location: "Airport", fuelType: "Hybrid", transmission: "Automatic", seats: 5,
    image: vehicleImages.suv,
    lastService: "2026-03-20", nextService: "2026-06-20",
    maintenanceLog: [
      { date: "2026-03-20", type: "Oil Change", cost: 95, notes: "Synthetic oil" },
    ],
    rentalHistory: [
      { customerId: "c1", startDate: "2026-02-01", endDate: "2026-02-05", revenue: 260 },
    ],
  },
  {
    id: "v7", make: "Jeep", model: "Grand Cherokee", year: 2024, category: "suv",
    plate: "CA-302-RT", color: "Green", mileage: 31200, dailyRate: 80,
    status: "available", location: "Downtown", fuelType: "Gasoline", transmission: "Automatic", seats: 5,
    image: vehicleImages.suv,
    lastService: "2026-03-10", nextService: "2026-06-10",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c6", startDate: "2026-03-01", endDate: "2026-03-07", revenue: 480 },
    ],
  },
  {
    id: "v8", make: "Ford", model: "Explorer", year: 2025, category: "suv",
    plate: "CA-303-RT", color: "White", mileage: 4300, dailyRate: 75,
    status: "rented", location: "Airport", fuelType: "Hybrid", transmission: "Automatic", seats: 7,
    image: vehicleImages.suv,
    lastService: "2026-01-15", nextService: "2026-04-15",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c7", startDate: "2026-04-03", endDate: "2026-04-10", revenue: 525 },
    ],
  },
  {
    id: "v9", make: "Volkswagen", model: "Transporter", year: 2024, category: "van",
    plate: "CA-401-RT", color: "White", mileage: 28700, dailyRate: 90,
    status: "available", location: "Downtown", fuelType: "Diesel", transmission: "Manual", seats: 9,
    image: vehicleImages.van,
    lastService: "2026-02-28", nextService: "2026-05-28",
    maintenanceLog: [
      { date: "2026-02-28", type: "Transmission Service", cost: 400, notes: "Fluid change" },
    ],
    rentalHistory: [],
  },
  {
    id: "v10", make: "Mercedes-Benz", model: "Vito", year: 2025, category: "van",
    plate: "CA-402-RT", color: "Silver", mileage: 11500, dailyRate: 95,
    status: "rented", location: "Airport", fuelType: "Diesel", transmission: "Automatic", seats: 8,
    image: vehicleImages.van,
    lastService: "2026-03-05", nextService: "2026-06-05",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c8", startDate: "2026-04-01", endDate: "2026-04-06", revenue: 475 },
    ],
  },
  {
    id: "v11", make: "BMW", model: "7 Series", year: 2025, category: "luxury",
    plate: "CA-501-RT", color: "Black", mileage: 3200, dailyRate: 150,
    status: "available", location: "Airport", fuelType: "Hybrid", transmission: "Automatic", seats: 5,
    image: vehicleImages.luxury,
    lastService: "2026-03-25", nextService: "2026-06-25",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c9", startDate: "2026-03-15", endDate: "2026-03-18", revenue: 450 },
    ],
  },
  {
    id: "v12", make: "Mercedes-Benz", model: "S-Class", year: 2025, category: "luxury",
    plate: "CA-502-RT", color: "Navy", mileage: 6800, dailyRate: 180,
    status: "rented", location: "Downtown", fuelType: "Hybrid", transmission: "Automatic", seats: 5,
    image: vehicleImages.luxury,
    lastService: "2026-02-15", nextService: "2026-05-15",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c10", startDate: "2026-04-04", endDate: "2026-04-11", revenue: 1260 },
    ],
  },
  {
    id: "v13", make: "Fiat", model: "500", year: 2024, category: "compact",
    plate: "CA-103-RT", color: "Yellow", mileage: 15600, dailyRate: 30,
    status: "available", location: "Downtown", fuelType: "Gasoline", transmission: "Manual", seats: 4,
    image: vehicleImages.compact,
    lastService: "2026-03-18", nextService: "2026-06-18",
    maintenanceLog: [],
    rentalHistory: [],
  },
  {
    id: "v14", make: "Hyundai", model: "Tucson", year: 2024, category: "suv",
    plate: "CA-304-RT", color: "Blue", mileage: 19400, dailyRate: 60,
    status: "retired", location: "Storage", fuelType: "Diesel", transmission: "Automatic", seats: 5,
    image: vehicleImages.suv,
    lastService: "2026-01-20", nextService: "-",
    maintenanceLog: [
      { date: "2026-01-20", type: "Final Inspection", cost: 150, notes: "Prepared for sale" },
    ],
    rentalHistory: [],
  },
  {
    id: "v15", make: "Renault", model: "Clio", year: 2025, category: "compact",
    plate: "CA-104-RT", color: "Red", mileage: 7800, dailyRate: 32,
    status: "available", location: "Airport", fuelType: "Gasoline", transmission: "Manual", seats: 5,
    image: vehicleImages.compact,
    lastService: "2026-03-22", nextService: "2026-06-22",
    maintenanceLog: [],
    rentalHistory: [
      { customerId: "c2", startDate: "2026-03-25", endDate: "2026-03-28", revenue: 96 },
    ],
  },
];

export const customers: Customer[] = [
  { id: "c1", firstName: "Marco", lastName: "Rossi", email: "marco.rossi@email.com", phone: "+39 333 1234567", licenseNumber: "IT-DL-001234", licenseExpiry: "2028-06-15", verified: true, address: "Via Roma 42, Milano", totalRentals: 5, totalSpent: 1250 },
  { id: "c2", firstName: "Sophie", lastName: "Martin", email: "sophie.martin@email.com", phone: "+33 6 12345678", licenseNumber: "FR-DL-005678", licenseExpiry: "2027-11-20", verified: true, address: "15 Rue de Paris, Lyon", totalRentals: 3, totalSpent: 890 },
  { id: "c3", firstName: "James", lastName: "Wilson", email: "james.wilson@email.com", phone: "+44 7911 123456", licenseNumber: "UK-DL-009012", licenseExpiry: "2029-03-10", verified: true, address: "10 Oxford Street, London", totalRentals: 2, totalSpent: 620 },
  { id: "c4", firstName: "Anna", lastName: "Mueller", email: "anna.mueller@email.com", phone: "+49 170 1234567", licenseNumber: "DE-DL-003456", licenseExpiry: "2027-08-25", verified: true, address: "Hauptstr. 5, Berlin", totalRentals: 4, totalSpent: 2100 },
  { id: "c5", firstName: "Carlos", lastName: "Garcia", email: "carlos.garcia@email.com", phone: "+34 612 345678", licenseNumber: "ES-DL-007890", licenseExpiry: "2028-01-30", verified: false, address: "Calle Mayor 20, Madrid", totalRentals: 1, totalSpent: 375 },
  { id: "c6", firstName: "Elena", lastName: "Popov", email: "elena.popov@email.com", phone: "+40 722 123456", licenseNumber: "RO-DL-002345", licenseExpiry: "2027-05-12", verified: true, address: "Bd. Unirii 8, Bucharest", totalRentals: 6, totalSpent: 3200 },
  { id: "c7", firstName: "David", lastName: "Chen", email: "david.chen@email.com", phone: "+1 415 5551234", licenseNumber: "US-DL-006789", licenseExpiry: "2028-09-18", verified: true, address: "Market St 200, San Francisco", totalRentals: 2, totalSpent: 950 },
  { id: "c8", firstName: "Lisa", lastName: "Andersen", email: "lisa.andersen@email.com", phone: "+45 20 123456", licenseNumber: "DK-DL-004567", licenseExpiry: "2029-02-28", verified: true, address: "Stroget 15, Copenhagen", totalRentals: 1, totalSpent: 475 },
  { id: "c9", firstName: "Kenji", lastName: "Tanaka", email: "kenji.tanaka@email.com", phone: "+81 90 12345678", licenseNumber: "JP-DL-008901", licenseExpiry: "2027-12-05", verified: true, address: "Shibuya 3-2, Tokyo", totalRentals: 3, totalSpent: 1680 },
  { id: "c10", firstName: "Fatima", lastName: "Al-Hassan", email: "fatima.alhassan@email.com", phone: "+971 50 1234567", licenseNumber: "AE-DL-001678", licenseExpiry: "2028-04-22", verified: true, address: "Sheikh Zayed Rd, Dubai", totalRentals: 2, totalSpent: 2520 },
];

export const reservations: Reservation[] = [
  { id: "r1", customerId: "c2", customerName: "Sophie Martin", vehicleId: "v2", vehicleName: "VW Golf", startDate: "2026-04-01", endDate: "2026-04-08", status: "active", dailyRate: 38, totalCost: 266, extras: ["GPS", "Wi-Fi"], pickupLocation: "Downtown", returnLocation: "Downtown", notes: "Returning customer", createdAt: "2026-03-28" },
  { id: "r2", customerId: "c4", customerName: "Anna Mueller", vehicleId: "v4", vehicleName: "Mercedes C-Class", startDate: "2026-04-02", endDate: "2026-04-09", status: "active", dailyRate: 85, totalCost: 595, extras: ["GPS", "Child Seat"], pickupLocation: "Downtown", returnLocation: "Airport", notes: "Business trip", createdAt: "2026-03-25" },
  { id: "r3", customerId: "c7", customerName: "David Chen", vehicleId: "v8", vehicleName: "Ford Explorer", startDate: "2026-04-03", endDate: "2026-04-10", status: "active", dailyRate: 75, totalCost: 525, extras: ["GPS", "Wi-Fi", "Child Seat"], pickupLocation: "Airport", returnLocation: "Airport", notes: "Family vacation", createdAt: "2026-03-30" },
  { id: "r4", customerId: "c8", customerName: "Lisa Andersen", vehicleId: "v10", vehicleName: "Mercedes Vito", startDate: "2026-04-01", endDate: "2026-04-06", status: "active", dailyRate: 95, totalCost: 475, extras: ["GPS"], pickupLocation: "Airport", returnLocation: "Airport", notes: "Group tour", createdAt: "2026-03-29" },
  { id: "r5", customerId: "c10", customerName: "Fatima Al-Hassan", vehicleId: "v12", vehicleName: "Mercedes S-Class", startDate: "2026-04-04", endDate: "2026-04-11", status: "active", dailyRate: 180, totalCost: 1260, extras: ["Wi-Fi"], pickupLocation: "Downtown", returnLocation: "Downtown", notes: "VIP client", createdAt: "2026-04-01" },
  { id: "r6", customerId: "c1", customerName: "Marco Rossi", vehicleId: "v6", vehicleName: "Toyota RAV4", startDate: "2026-04-08", endDate: "2026-04-12", status: "confirmed", dailyRate: 65, totalCost: 260, extras: ["GPS"], pickupLocation: "Airport", returnLocation: "Airport", notes: "", createdAt: "2026-04-02" },
  { id: "r7", customerId: "c3", customerName: "James Wilson", vehicleId: "v11", vehicleName: "BMW 7 Series", startDate: "2026-04-10", endDate: "2026-04-14", status: "confirmed", dailyRate: 150, totalCost: 600, extras: ["Wi-Fi"], pickupLocation: "Airport", returnLocation: "Downtown", notes: "Airport pickup requested", createdAt: "2026-04-03" },
  { id: "r8", customerId: "c6", customerName: "Elena Popov", vehicleId: "v1", vehicleName: "Toyota Yaris", startDate: "2026-04-09", endDate: "2026-04-15", status: "pending", dailyRate: 35, totalCost: 210, extras: [], pickupLocation: "Downtown", returnLocation: "Downtown", notes: "Awaiting license verification", createdAt: "2026-04-04" },
  { id: "r9", customerId: "c9", customerName: "Kenji Tanaka", vehicleId: "v7", vehicleName: "Jeep Grand Cherokee", startDate: "2026-04-12", endDate: "2026-04-18", status: "pending", dailyRate: 80, totalCost: 480, extras: ["GPS", "Wi-Fi"], pickupLocation: "Downtown", returnLocation: "Airport", notes: "", createdAt: "2026-04-05" },
  { id: "r10", customerId: "c1", customerName: "Marco Rossi", vehicleId: "v3", vehicleName: "BMW 3 Series", startDate: "2026-03-10", endDate: "2026-03-14", status: "completed", dailyRate: 75, totalCost: 300, extras: ["GPS"], pickupLocation: "Airport", returnLocation: "Airport", notes: "No issues", createdAt: "2026-03-05" },
  { id: "r11", customerId: "c5", customerName: "Carlos Garcia", vehicleId: "v3", vehicleName: "BMW 3 Series", startDate: "2026-02-15", endDate: "2026-02-20", status: "completed", dailyRate: 75, totalCost: 375, extras: [], pickupLocation: "Airport", returnLocation: "Downtown", notes: "", createdAt: "2026-02-10" },
  { id: "r12", customerId: "c6", customerName: "Elena Popov", vehicleId: "v7", vehicleName: "Jeep Grand Cherokee", startDate: "2026-03-01", endDate: "2026-03-07", status: "completed", dailyRate: 80, totalCost: 480, extras: ["GPS", "Child Seat"], pickupLocation: "Downtown", returnLocation: "Downtown", notes: "", createdAt: "2026-02-25" },
  { id: "r13", customerId: "c5", customerName: "Carlos Garcia", vehicleId: "v13", vehicleName: "Fiat 500", startDate: "2026-04-05", endDate: "2026-04-07", status: "cancelled", dailyRate: 30, totalCost: 60, extras: [], pickupLocation: "Downtown", returnLocation: "Downtown", notes: "Customer cancelled - flight change", createdAt: "2026-04-01" },
];

export function getCustomer(id: string) {
  return customers.find((c) => c.id === id);
}

export function getVehicle(id: string) {
  return vehicles.find((v) => v.id === id);
}

export const statusColors: Record<ReservationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export const vehicleStatusColors: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-800",
  rented: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  retired: "bg-gray-100 text-gray-800",
};
