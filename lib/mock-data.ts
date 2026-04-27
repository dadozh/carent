export type VehicleStatus = "available" | "rented" | "maintenance" | "retired";
export type VehicleCategory = "compact" | "sedan" | "suv" | "van" | "luxury";
export type ReservationStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export type FuelType = "Gasoline" | "Diesel" | "Hybrid" | "Electric" | "LPG";
export type Transmission = "Manual" | "Automatic" | "CVT" | "Semi-Auto";
export type SwapReasonType = "breakdown" | "accident" | "customer_request" | "other";
export type FuelLevel = "empty" | "quarter" | "half" | "three_quarter" | "full";

export interface ReturnChecklist {
  returnMileage: number;
  fuelLevel: FuelLevel;
  hasDamage: boolean;
  damageDescription?: string;
  extraCharges?: number;
  notes?: string;
  returnPhotos?: string[];
  completedAt: string;
}

export interface ReservationPayment {
  paidAt: string;
  method: "cash";
  amount: number;
}

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
  pricingTemplateId?: string | null;
  pricingTiers?: { maxDays: number | null; dailyRate: number }[];
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
  maintenanceLog: { date: string; mileage?: number; type: string; cost: number; notes: string }[];
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
  blacklisted?: boolean;
  internalNotes?: string;
}

export type CustomerUpdateInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  address?: string;
  verified?: boolean;
  blacklisted?: boolean;
  internalNotes?: string;
};

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
    reasonType: SwapReasonType;
    fromVehicleCondition?: string;
  }>;
  // Rental extension log
  extensions?: Array<{
    previousEndDate: string;
    previousReturnTime: string;
    newEndDate: string;
    newReturnTime: string;
    additionalCost: number;
    extendedAt: string;
  }>;
  // Return checklist (completed reservations)
  returnChecklist?: ReturnChecklist;
  // Payment tracking (cash only for now)
  payments?: ReservationPayment[];
  // Legacy single-payment shape kept for read compatibility.
  payment?: {
    paidAt: string;
    method: "cash";
    amountPaid: number;
  };
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
