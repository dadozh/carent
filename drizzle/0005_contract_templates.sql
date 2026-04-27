CREATE TABLE IF NOT EXISTS "contract_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "language" text NOT NULL,
  "name" text NOT NULL,
  "draft_content" text NOT NULL,
  "published_content" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contract_templates_tenant_language_uniq" ON "contract_templates" USING btree ("tenant_id","language");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contract_templates_tenant_idx" ON "contract_templates" USING btree ("tenant_id","language");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_contracts" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "reservation_id" text NOT NULL,
  "language" text NOT NULL,
  "template_id" text REFERENCES "contract_templates"("id"),
  "file_url" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "generated_contracts_tenant_reservation_language_uniq" ON "generated_contracts" USING btree ("tenant_id","reservation_id","language");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "generated_contracts_tenant_reservation_idx" ON "generated_contracts" USING btree ("tenant_id","reservation_id");
