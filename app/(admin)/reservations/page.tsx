"use client";

import { useState } from "react";
import {
  reservations,
  vehicles,
  customers,
  statusColors,
  type ReservationStatus,
  type Reservation,
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  X,
  MapPin,
  Calendar,
  User,
  Car,
  ChevronRight,
  ChevronLeft,
  Check,
  Navigation,
  Wifi,
  Baby,
} from "lucide-react";

const statusFilters: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const extraIcons: Record<string, typeof Navigation> = {
  GPS: Navigation,
  "Wi-Fi": Wifi,
  "Child Seat": Baby,
};

type BookingStep = "dates" | "vehicle" | "customer" | "extras" | "summary";
const steps: { key: BookingStep; label: string }[] = [
  { key: "dates", label: "Dates & Location" },
  { key: "vehicle", label: "Select Vehicle" },
  { key: "customer", label: "Customer" },
  { key: "extras", label: "Extras" },
  { key: "summary", label: "Summary" },
];

export default function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("dates");

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    startDate: "",
    endDate: "",
    pickupLocation: "Airport",
    returnLocation: "Airport",
    vehicleId: "",
    customerId: "",
    extras: [] as string[],
  });

  const filtered = reservations.filter((r) => {
    const matchesSearch =
      `${r.customerName} ${r.vehicleName} ${r.id}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedVehicle = vehicles.find((v) => v.id === newBooking.vehicleId);
  const selectedCustomer = customers.find((c) => c.id === newBooking.customerId);
  const dayCount =
    newBooking.startDate && newBooking.endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const currentStepIndex = steps.findIndex((s) => s.key === bookingStep);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">
            {reservations.length} total &middot;{" "}
            {reservations.filter((r) => r.status === "active").length} active
          </p>
        </div>
        <Button onClick={() => { setShowNewBooking(true); setBookingStep("dates"); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Reservation List */}
        <div className="lg:col-span-3">
          <Card>
            <div className="divide-y">
              {filtered.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => { setSelectedReservation(reservation); setShowNewBooking(false); }}
                  className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedReservation?.id === reservation.id ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{reservation.customerName}</p>
                      <Badge className={statusColors[reservation.status]} variant="secondary">
                        {reservation.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reservation.vehicleName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.startDate} &rarr; {reservation.endDate}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">&euro;{reservation.totalCost}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.extras.length > 0 ? reservation.extras.join(", ") : "No extras"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No bookings found.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Detail Panel / New Booking Form */}
        <div className="lg:col-span-2">
          {showNewBooking ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>New Booking</CardTitle>
                <button onClick={() => setShowNewBooking(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent>
                {/* Step indicator */}
                <div className="flex items-center gap-1 mb-6">
                  {steps.map((step, i) => (
                    <div key={step.key} className="flex items-center gap-1">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                          i <= currentStepIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i < currentStepIndex ? <Check className="h-3 w-3" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-0.5 w-4 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium mb-4">{steps[currentStepIndex].label}</p>

                {bookingStep === "dates" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Pick-up Date</label>
                      <Input
                        type="date"
                        value={newBooking.startDate}
                        onChange={(e) => setNewBooking({ ...newBooking, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Return Date</label>
                      <Input
                        type="date"
                        value={newBooking.endDate}
                        onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Pick-up Location</label>
                      <div className="flex gap-2 mt-1">
                        {["Airport", "Downtown"].map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking({ ...newBooking, pickupLocation: loc })}
                            className={`flex-1 rounded-lg border p-2 text-sm ${
                              newBooking.pickupLocation === loc ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Return Location</label>
                      <div className="flex gap-2 mt-1">
                        {["Airport", "Downtown"].map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setNewBooking({ ...newBooking, returnLocation: loc })}
                            className={`flex-1 rounded-lg border p-2 text-sm ${
                              newBooking.returnLocation === loc ? "border-primary bg-primary/5" : ""
                            }`}
                          >
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {bookingStep === "vehicle" && (
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {vehicles
                      .filter((v) => v.status === "available")
                      .map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setNewBooking({ ...newBooking, vehicleId: v.id })}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            newBooking.vehicleId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                          }`}
                        >
                          <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {v.make} {v.model}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {v.category} &middot; {v.seats} seats &middot; {v.transmission}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary">&euro;{v.dailyRate}/d</p>
                        </button>
                      ))}
                  </div>
                )}

                {bookingStep === "customer" && (
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setNewBooking({ ...newBooking, customerId: c.id })}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          newBooking.customerId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <User className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                        {c.verified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            Verified
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {bookingStep === "extras" && (
                  <div className="space-y-2">
                    {["GPS", "Wi-Fi", "Child Seat"].map((extra) => {
                      const Icon = extraIcons[extra] || Navigation;
                      const selected = newBooking.extras.includes(extra);
                      return (
                        <button
                          key={extra}
                          onClick={() =>
                            setNewBooking({
                              ...newBooking,
                              extras: selected
                                ? newBooking.extras.filter((e) => e !== extra)
                                : [...newBooking.extras, extra],
                            })
                          }
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium flex-1">{extra}</span>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {bookingStep === "summary" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vehicle</span>
                        <span className="font-medium">
                          {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-medium">
                          {selectedCustomer
                            ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dates</span>
                        <span className="font-medium">
                          {newBooking.startDate || "-"} &rarr; {newBooking.endDate || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">{dayCount} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pick-up</span>
                        <span className="font-medium">{newBooking.pickupLocation}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Return</span>
                        <span className="font-medium">{newBooking.returnLocation}</span>
                      </div>
                      {newBooking.extras.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Extras</span>
                          <span className="font-medium">{newBooking.extras.join(", ")}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-primary">
                          &euro;{selectedVehicle ? selectedVehicle.dailyRate * dayCount : 0}
                        </span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => { setShowNewBooking(false); }}>
                      Confirm Booking
                    </Button>
                  </div>
                )}

                {bookingStep !== "summary" && (
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentStepIndex === 0}
                      onClick={() => setBookingStep(steps[currentStepIndex - 1].key)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setBookingStep(steps[currentStepIndex + 1].key)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedReservation ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Booking Details</CardTitle>
                <button onClick={() => setSelectedReservation(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">#{selectedReservation.id}</p>
                  <Badge className={statusColors[selectedReservation.status]} variant="secondary">
                    {selectedReservation.status}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{selectedReservation.customerName}</p>
                      <p className="text-xs text-muted-foreground">Customer</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{selectedReservation.vehicleName}</p>
                      <p className="text-xs text-muted-foreground">Vehicle</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedReservation.startDate} &rarr; {selectedReservation.endDate}
                      </p>
                      <p className="text-xs text-muted-foreground">Rental Period</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedReservation.pickupLocation} &rarr; {selectedReservation.returnLocation}
                      </p>
                      <p className="text-xs text-muted-foreground">Locations</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Extras</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedReservation.extras.length > 0 ? (
                      selectedReservation.extras.map((extra) => (
                        <Badge key={extra} variant="outline">
                          {extra}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">None</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily Rate</span>
                    <span>&euro;{selectedReservation.dailyRate}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-1">
                    <span>Total</span>
                    <span className="text-primary">&euro;{selectedReservation.totalCost}</span>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{selectedReservation.notes}</p>
                    </div>
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  Created: {selectedReservation.createdAt}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a booking to view details, or create a new one.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
