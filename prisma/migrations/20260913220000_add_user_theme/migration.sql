-- AlterTable: add theme to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'wani';

-- Backfill: All existing users default to 'wani'
UPDATE "User"
SET "theme" = 'wani'
WHERE "theme" IS NULL;
