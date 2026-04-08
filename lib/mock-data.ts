export type VehicleStatus = "available" | "rented" | "maintenance" | "retired";
export type VehicleCategory = "compact" | "sedan" | "suv" | "van" | "luxury";
export type ReservationStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export type FuelType = "Gasoline" | "Diesel" | "Hybrid" | "Electric" | "LPG";
export type Transmission = "Manual" | "Automatic" | "CVT" | "Semi-Auto";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  category: VehicleCategory;
  plate: string;
  vin?: string;
  color: string;
  mileage: number;
  dailyRate: number;
  status: VehicleStatus;
  location: string;
  fuelType: FuelType | string;
  transmission: Transmission | string;
  seats: number;
  luggageCount: number;
  image: string;
  images: string[];
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
  images: string[];
}

export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  startDate: string;
  pickupTime: string;
  endDate: string;
  returnTime: string;
  status: ReservationStatus;
  dailyRate: number;
  totalCost: number;
  extras: string[];
  pickupLocation: string;
  returnLocation: string;
  notes: string;
  createdAt: string;
  images: string[];
  // Cancellation details (active reservations)
  cancellationReason?: string;
  adjustedCost?: number;
  // Vehicle swap log (mid-rental replacement)
  vehicleSwaps?: Array<{
    fromVehicleId: string;
    fromVehicleName: string;
    fromVehiclePlate: string;
    toVehicleId: string;
    toVehicleName: string;
    toVehiclePlate: string;
    swappedAt: string;
    reason: string;
  }>;
}

export const vehicles: Vehicle[] = [];

export const customers: Customer[] = [];

export const reservations: Reservation[] = [];

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
