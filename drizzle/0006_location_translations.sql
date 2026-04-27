ALTER TABLE "tenant_settings"
  ADD COLUMN "locations_v2" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

UPDATE "tenant_settings"
SET "locations_v2" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'key', elem,
        'labels', jsonb_build_object('en', elem, 'sr', elem)
      )
    )
    FROM unnest("locations") AS elem
  ),
  '[]'::jsonb
);
--> statement-breakpoint

ALTER TABLE "tenant_settings"
  DROP COLUMN "locations";
--> statement-breakpoint

ALTER TABLE "tenant_settings"
  RENAME COLUMN "locations_v2" TO "locations";
