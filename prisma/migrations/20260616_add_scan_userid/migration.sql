-- Migration: add nullable userId column to Scan
-- Adds column only if it doesn't already exist. No FK added to avoid type/compat issues.

ALTER TABLE IF EXISTS "Scan"
ADD COLUMN IF NOT EXISTS "userId" text;

-- Optional: add FK constraint if `User.id` is text and you want referential integrity.
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'fk_scan_userid') THEN
--     ALTER TABLE "Scan" ADD CONSTRAINT fk_scan_userid FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
--   END IF;
-- END$$;
