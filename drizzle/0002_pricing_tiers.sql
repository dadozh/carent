CREATE TABLE "pricing_templates" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pricing_templates_tenant_idx" ON "pricing_templates" ("tenant_id");
--> statement-breakpoint
CREATE TABLE "pricing_template_tiers" (
  "id" text PRIMARY KEY,
  "template_id" text NOT NULL REFERENCES "pricing_templates"("id") ON DELETE CASCADE,
  "max_days" integer,
  "daily_rate" numeric(10, 2) NOT NULL,
  "position" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "vehicle_pricing_tiers" (
  "id" text PRIMARY KEY,
  "vehicle_id" text NOT NULL,
  "tenant_id" text NOT NULL,
  "max_days" integer,
  "daily_rate" numeric(10, 2) NOT NULL,
  "position" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "vehicle_pricing_tiers_vehicle_idx" ON "vehicle_pricing_tiers" ("vehicle_id");
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "pricing_template_id" text;
