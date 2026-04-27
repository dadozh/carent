ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "contract_languages" text[] NOT NULL DEFAULT '{en,sr}';
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "ui_languages" text[] NOT NULL DEFAULT '{en,sr}';
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "default_contract_language" text NOT NULL DEFAULT 'en';
ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "default_ui_language" text NOT NULL DEFAULT 'en';
