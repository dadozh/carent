ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'EUR';
