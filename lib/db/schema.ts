import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ─── Tenants & auth ───────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  plan:      text("plan").notNull().default("trial"),
  active:    boolean("active").notNull().default(true),
  logoUrl:   text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantSettings = pgTable("tenant_settings", {
  tenantId:  text("tenant_id").primaryKey().references(() => tenants.id),
  locations: text("locations").array().notNull().default([]),
  extras:    text("extras").array().notNull().default([]),
  currency:  text("currency").notNull().default("EUR"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id:           text("id").primaryKey(),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  role:         text("role").notNull(),
  active:       boolean("active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("users_tenant_email_uniq").on(t.tenantId, t.email),
]);

export const tenantBillingSettings = pgTable("tenant_billing_settings", {
  tenantId:               text("tenant_id").primaryKey().references(() => tenants.id),
  baseMonthlyPrice:       numeric("base_monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  perVehicleMonthlyPrice: numeric("per_vehicle_monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt:              timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantInvoices = pgTable("tenant_invoices", {
  id:                     text("id").primaryKey(),
  tenantId:               text("tenant_id").notNull().references(() => tenants.id),
  billingMonth:           text("billing_month").notNull(),
  periodStart:            text("period_start").notNull(),
  periodEnd:              text("period_end").notNull(),
  baseMonthlyPrice:       numeric("base_monthly_price", { precision: 12, scale: 2 }).notNull(),
  perVehicleMonthlyPrice: numeric("per_vehicle_monthly_price", { precision: 12, scale: 2 }).notNull(),
  vehicleCount:           integer("vehicle_count").notNull(),
  totalAmount:            numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status:                 text("status").notNull().default("draft"),
  createdAt:              timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("tenant_invoices_month_uniq").on(t.tenantId, t.billingMonth),
]);

export const tenantFeatureOverrides = pgTable("tenant_feature_overrides", {
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  feature:  text("feature").notNull(),
  enabled:  boolean("enabled").notNull(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.feature] }),
]);

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const pricingTemplates = pgTable("pricing_templates", {
  id:        text("id").primaryKey(),
  tenantId:  text("tenant_id").notNull().references(() => tenants.id),
  name:      text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pricing_templates_tenant_idx").on(t.tenantId),
]);

export const pricingTemplateTiers = pgTable("pricing_template_tiers", {
  id:         text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => pricingTemplates.id, { onDelete: "cascade" }),
  maxDays:    integer("max_days"),
  dailyRate:  numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  position:   integer("position").notNull().default(0),
});

export const vehiclePricingTiers = pgTable("vehicle_pricing_tiers", {
  id:        text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull(),
  tenantId:  text("tenant_id").notNull(),
  maxDays:   integer("max_days"),
  dailyRate:  numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  position:  integer("position").notNull().default(0),
}, (t) => [
  index("vehicle_pricing_tiers_vehicle_idx").on(t.vehicleId),
]);

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const vehicles = pgTable("vehicles", {
  id:           text("id").primaryKey(),
  tenantId:     text("tenant_id").notNull().references(() => tenants.id),
  make:         text("make").notNull(),
  model:        text("model").notNull(),
  trim:         text("trim"),
  year:         integer("year").notNull(),
  category:     text("category").notNull(),
  plate:        text("plate").notNull(),
  vin:          text("vin"),
  color:        text("color").notNull(),
  mileage:      integer("mileage").notNull().default(0),
  dailyRate:    numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  status:       text("status").notNull().default("available"),
  location:     text("location").notNull().default(""),
  fuelType:     text("fuel_type").notNull(),
  transmission: text("transmission").notNull(),
  seats:        integer("seats").notNull().default(5),
  luggageCount:      integer("luggage_count").notNull().default(0),
  pricingTemplateId: text("pricing_template_id"),
  image:             text("image").notNull().default(""),
  lastService:  text("last_service").notNull().default(""),
  nextService:  text("next_service").notNull().default(""),
  archivedAt:   timestamp("archived_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("vehicles_tenant_idx").on(t.tenantId),
]);

export const vehicleImages = pgTable("vehicle_images", {
  id:        text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  url:       text("url").notNull(),
  position:  integer("position").notNull().default(0),
}, (t) => [
  index("vehicle_images_vehicle_idx").on(t.vehicleId),
]);

export const vehicleMaintenanceLogs = pgTable("vehicle_maintenance_logs", {
  id:        text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  date:      text("date").notNull(),
  mileage:   integer("mileage"),
  type:      text("type").notNull(),
  cost:      numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:     text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("maintenance_vehicle_idx").on(t.vehicleId),
]);

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id:            text("id").primaryKey(),
  tenantId:      text("tenant_id").notNull().references(() => tenants.id),
  firstName:     text("first_name").notNull(),
  lastName:      text("last_name").notNull(),
  email:         text("email").notNull(),
  phone:         text("phone").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseExpiry: text("license_expiry").notNull(),
  address:       text("address").notNull().default(""),
  verified:      boolean("verified").notNull().default(true),
  blacklisted:   boolean("blacklisted").notNull().default(false),
  internalNotes: text("internal_notes"),
  totalRentals:  integer("total_rentals").notNull().default(0),
  totalSpent:    numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("customers_tenant_idx").on(t.tenantId),
  unique("customers_tenant_email_uniq").on(t.tenantId, t.email),
  unique("customers_tenant_license_uniq").on(t.tenantId, t.licenseNumber),
]);

export const customerImages = pgTable("customer_images", {
  id:         text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  url:        text("url").notNull(),
  position:   integer("position").notNull().default(0),
});

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservations = pgTable("reservations", {
  id:                 text("id").notNull(),
  tenantId:           text("tenant_id").notNull().references(() => tenants.id),
  customerId:         text("customer_id").notNull().references(() => customers.id),
  customerName:       text("customer_name").notNull(),
  vehicleId:          text("vehicle_id").notNull().references(() => vehicles.id),
  vehicleName:        text("vehicle_name").notNull(),
  vehiclePlate:       text("vehicle_plate").notNull().default(""),
  startDate:          text("start_date").notNull(),
  pickupTime:         text("pickup_time").notNull(),
  endDate:            text("end_date").notNull(),
  returnTime:         text("return_time").notNull(),
  status:             text("status").notNull().default("confirmed"),
  dailyRate:          numeric("daily_rate", { precision: 10, scale: 2 }).notNull(),
  totalCost:          numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  pickupLocation:     text("pickup_location").notNull().default(""),
  returnLocation:     text("return_location").notNull().default(""),
  notes:              text("notes").notNull().default(""),
  cancellationReason: text("cancellation_reason"),
  adjustedCost:       numeric("adjusted_cost", { precision: 10, scale: 2 }),
  createdAt:          text("created_at").notNull(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.id] }),
  index("reservations_tenant_idx").on(t.tenantId),
  index("reservations_customer_idx").on(t.customerId),
  index("reservations_vehicle_idx").on(t.vehicleId),
]);

export const reservationExtras = pgTable("reservation_extras", {
  reservationId: text("reservation_id").notNull(),
  tenantId:      text("tenant_id").notNull(),
  extra:         text("extra").notNull(),
  position:      integer("position").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.reservationId, t.extra] }),
]);

export const reservationExtensions = pgTable("reservation_extensions", {
  id:                 text("id").primaryKey(),
  reservationId:      text("reservation_id").notNull(),
  tenantId:           text("tenant_id").notNull(),
  previousEndDate:    text("previous_end_date").notNull(),
  previousReturnTime: text("previous_return_time").notNull(),
  newEndDate:         text("new_end_date").notNull(),
  newReturnTime:      text("new_return_time").notNull(),
  additionalCost:     numeric("additional_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  extendedAt:         timestamp("extended_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("extensions_reservation_idx").on(t.tenantId, t.reservationId),
]);

export const reservationPayments = pgTable("reservation_payments", {
  id:            text("id").primaryKey(),
  reservationId: text("reservation_id").notNull(),
  tenantId:      text("tenant_id").notNull(),
  paidAt:        timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  method:        text("method").notNull().default("cash"),
  amount:        numeric("amount", { precision: 10, scale: 2 }).notNull(),
}, (t) => [
  index("payments_reservation_idx").on(t.tenantId, t.reservationId),
]);

export const vehicleSwaps = pgTable("vehicle_swaps", {
  id:                   text("id").primaryKey(),
  reservationId:        text("reservation_id").notNull(),
  tenantId:             text("tenant_id").notNull(),
  fromVehicleId:        text("from_vehicle_id").notNull(),
  fromVehicleName:      text("from_vehicle_name").notNull(),
  fromVehiclePlate:     text("from_vehicle_plate").notNull(),
  toVehicleId:          text("to_vehicle_id").notNull(),
  toVehicleName:        text("to_vehicle_name").notNull(),
  toVehiclePlate:       text("to_vehicle_plate").notNull(),
  swappedAt:            timestamp("swapped_at", { withTimezone: true }).notNull().defaultNow(),
  reason:               text("reason").notNull().default(""),
  reasonType:           text("reason_type").notNull(),
  fromVehicleCondition: text("from_vehicle_condition"),
}, (t) => [
  index("swaps_reservation_idx").on(t.tenantId, t.reservationId),
]);

export const returnChecklists = pgTable("return_checklists", {
  reservationId:     text("reservation_id").notNull(),
  tenantId:          text("tenant_id").notNull(),
  returnMileage:     integer("return_mileage").notNull(),
  fuelLevel:         text("fuel_level").notNull(),
  hasDamage:         boolean("has_damage").notNull().default(false),
  damageDescription: text("damage_description"),
  extraCharges:      numeric("extra_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:             text("notes"),
  completedAt:       timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.reservationId] }),
]);

export const reservationImages = pgTable("reservation_images", {
  id:            text("id").primaryKey(),
  reservationId: text("reservation_id").notNull(),
  tenantId:      text("tenant_id").notNull(),
  url:           text("url").notNull(),
  position:      integer("position").notNull().default(0),
  source:        text("source").notNull().default("inspection"),
}, (t) => [
  index("res_images_reservation_idx").on(t.tenantId, t.reservationId),
]);

// ─── Audit logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id:         text("id").primaryKey(),
  tenantId:   text("tenant_id").notNull(),
  userId:     text("user_id").notNull(),
  userName:   text("user_name").notNull(),
  userRole:   text("user_role").notNull(),
  category:   text("category").notNull().default("operations"),
  entityType: text("entity_type").notNull(),
  entityId:   text("entity_id").notNull(),
  action:     text("action").notNull(),
  detail:     text("detail").notNull().default(""),
  ipAddress:  text("ip_address").notNull().default(""),
  userAgent:  text("user_agent").notNull().default(""),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_tenant_idx").on(t.tenantId, t.createdAt),
]);

// ─── Per-tenant sequential reservation ID counter ────────────────────────────

export const tenantReservationCounters = pgTable("tenant_reservation_counters", {
  tenantId:     text("tenant_id").primaryKey().references(() => tenants.id),
  lastIssuedId: integer("last_issued_id").notNull().default(0),
});
