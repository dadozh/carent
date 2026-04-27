ALTER TABLE "tenant_settings"
  ADD COLUMN "extras_v2" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

UPDATE "tenant_settings"
SET "extras_v2" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'key', elem,
        'labels', jsonb_build_object('en', elem, 'sr', elem),
        'price', 0
      )
    )
    FROM unnest("extras") AS elem
  ),
  '[]'::jsonb
);
--> statement-breakpoint

ALTER TABLE "tenant_settings"
  DROP COLUMN "extras";
--> statement-breakpoint

ALTER TABLE "tenant_settings"
  RENAME COLUMN "extras_v2" TO "extras";
