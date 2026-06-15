-- Migration: add foreign key constraint from Scan.userId -> User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_scan_userid'
  ) THEN
    ALTER TABLE "Scan"
      ADD CONSTRAINT fk_scan_userid FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
  END IF;
END$$;
