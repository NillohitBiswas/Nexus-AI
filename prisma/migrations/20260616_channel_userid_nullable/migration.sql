-- Make Channel.userId nullable to allow reference-only channels
BEGIN;
ALTER TABLE "Channel" ALTER COLUMN "userId" DROP NOT NULL;
COMMIT;
