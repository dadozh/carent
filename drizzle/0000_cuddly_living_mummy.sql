CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"category" text DEFAULT 'operations' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"ip_address" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_images" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"license_number" text NOT NULL,
	"license_expiry" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"blacklisted" boolean DEFAULT false NOT NULL,
	"internal_notes" text,
	"total_rentals" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_tenant_email_uniq" UNIQUE("tenant_id","email"),
	CONSTRAINT "customers_tenant_license_uniq" UNIQUE("tenant_id","license_number")
);
--> statement-breakpoint
CREATE TABLE "reservation_extensions" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"previous_end_date" text NOT NULL,
	"previous_return_time" text NOT NULL,
	"new_end_date" text NOT NULL,
	"new_return_time" text NOT NULL,
	"additional_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"extended_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_extras" (
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"extra" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reservation_extras_tenant_id_reservation_id_extra_pk" PRIMARY KEY("tenant_id","reservation_id","extra")
);
--> statement-breakpoint
CREATE TABLE "reservation_images" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'inspection' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"amount" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"vehicle_name" text NOT NULL,
	"vehicle_plate" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"pickup_time" text NOT NULL,
	"end_date" text NOT NULL,
	"return_time" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"daily_rate" numeric(10, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"pickup_location" text DEFAULT '' NOT NULL,
	"return_location" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"cancellation_reason" text,
	"adjusted_cost" numeric(10, 2),
	"created_at" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "return_checklists" (
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"return_mileage" integer NOT NULL,
	"fuel_level" text NOT NULL,
	"has_damage" boolean DEFAULT false NOT NULL,
	"damage_description" text,
	"extra_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_checklists_tenant_id_reservation_id_pk" PRIMARY KEY("tenant_id","reservation_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_billing_settings" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"base_monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"per_vehicle_monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_feature_overrides" (
	"tenant_id" text NOT NULL,
	"feature" text NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "tenant_feature_overrides_tenant_id_feature_pk" PRIMARY KEY("tenant_id","feature")
);
--> statement-breakpoint
CREATE TABLE "tenant_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"billing_month" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"base_monthly_price" numeric(12, 2) NOT NULL,
	"per_vehicle_monthly_price" numeric(12, 2) NOT NULL,
	"vehicle_count" integer NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invoices_month_uniq" UNIQUE("tenant_id","billing_month")
);
--> statement-breakpoint
CREATE TABLE "tenant_reservation_counters" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"last_issued_id" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"locations" text[] DEFAULT '{}' NOT NULL,
	"extras" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'trial' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_tenant_email_uniq" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_images" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"date" text NOT NULL,
	"mileage" integer,
	"type" text NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_swaps" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"from_vehicle_id" text NOT NULL,
	"from_vehicle_name" text NOT NULL,
	"from_vehicle_plate" text NOT NULL,
	"to_vehicle_id" text NOT NULL,
	"to_vehicle_name" text NOT NULL,
	"to_vehicle_plate" text NOT NULL,
	"swapped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"reason_type" text NOT NULL,
	"from_vehicle_condition" text
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"year" integer NOT NULL,
	"category" text NOT NULL,
	"plate" text NOT NULL,
	"vin" text,
	"color" text NOT NULL,
	"mileage" integer DEFAULT 0 NOT NULL,
	"daily_rate" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"fuel_type" text NOT NULL,
	"transmission" text NOT NULL,
	"seats" integer DEFAULT 5 NOT NULL,
	"luggage_count" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"last_service" text DEFAULT '' NOT NULL,
	"next_service" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_images" ADD CONSTRAINT "customer_images_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_billing_settings" ADD CONSTRAINT "tenant_billing_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_reservation_counters" ADD CONSTRAINT "tenant_reservation_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "customers_tenant_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "extensions_reservation_idx" ON "reservation_extensions" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE INDEX "res_images_reservation_idx" ON "reservation_images" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE INDEX "payments_reservation_idx" ON "reservation_payments" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE INDEX "reservations_tenant_idx" ON "reservations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reservations_customer_idx" ON "reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "reservations_vehicle_idx" ON "reservations" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_images_vehicle_idx" ON "vehicle_images" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "maintenance_vehicle_idx" ON "vehicle_maintenance_logs" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "swaps_reservation_idx" ON "vehicle_swaps" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE INDEX "vehicles_tenant_idx" ON "vehicles" USING btree ("tenant_id");