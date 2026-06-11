-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Developer Portal Rebuild
-- Changes:
--   1. Add firstName, lastName, phone to developer_users
--   2. Backfill name → firstName/lastName for existing rows
--   3. Drop old `name` column
--   4. Create developer_projects table
--   5. Add ProjectStatus enum
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add new columns (nullable first so existing rows don't break)
ALTER TABLE "developer_users"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName"  TEXT,
  ADD COLUMN IF NOT EXISTS "phone"     TEXT;

-- 2. Backfill: split existing `name` into firstName / lastName
--    If name has a space → split; otherwise put everything in firstName
UPDATE "developer_users"
SET
  "firstName" = CASE
    WHEN "name" IS NULL OR "name" = '' THEN 'Developer'
    WHEN POSITION(' ' IN TRIM("name")) > 0
         THEN TRIM(SPLIT_PART(TRIM("name"), ' ', 1))
    ELSE TRIM("name")
  END,
  "lastName" = CASE
    WHEN "name" IS NULL OR "name" = '' THEN ''
    WHEN POSITION(' ' IN TRIM("name")) > 0
         THEN TRIM(SUBSTRING(TRIM("name") FROM POSITION(' ' IN TRIM("name")) + 1))
    ELSE ''
  END,
  "phone" = COALESCE("phone", '')
WHERE "firstName" IS NULL;

-- 3. Make columns NOT NULL now that they're filled
ALTER TABLE "developer_users"
  ALTER COLUMN "firstName" SET NOT NULL,
  ALTER COLUMN "lastName"  SET NOT NULL,
  ALTER COLUMN "phone"     SET NOT NULL;

-- 4. Drop old name column (safe — data migrated)
ALTER TABLE "developer_users"
  DROP COLUMN IF EXISTS "name";

-- 5. ProjectStatus enum
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. developer_projects table
CREATE TABLE IF NOT EXISTS "developer_projects" (
  "id"                  TEXT        NOT NULL,
  "developerId"         TEXT        NOT NULL,
  "name"                TEXT        NOT NULL,
  "description"         TEXT,
  "status"              "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "transferredToUserId" TEXT,
  "transferredAt"       TIMESTAMP(3),

  CONSTRAINT "developer_projects_pkey" PRIMARY KEY ("id")
);

-- 7. Foreign key + index
ALTER TABLE "developer_projects"
  DROP CONSTRAINT IF EXISTS "developer_projects_developerId_fkey";
ALTER TABLE "developer_projects"
  ADD CONSTRAINT "developer_projects_developerId_fkey"
  FOREIGN KEY ("developerId")
  REFERENCES "developer_users"("id")
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "developer_projects_developerId_idx"
  ON "developer_projects"("developerId");