-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SignupMethod" AS ENUM ('MANUAL', 'GOOGLE', 'TEAM_INVITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupMethod" "SignupMethod" NOT NULL DEFAULT 'MANUAL';

-- Backfill existing rows so historical accounts keep behaving the way they already do today:
--   * Team members (has parentId)              -> TEAM_INVITE (never show Google Onboarding)
--   * Google-only accounts (no password set)    -> GOOGLE (may still need onboarding if phone missing)
--   * Everyone else                             -> MANUAL (default, no-op)
UPDATE "User" SET "signupMethod" = 'TEAM_INVITE' WHERE "parentId" IS NOT NULL;
UPDATE "User" SET "signupMethod" = 'GOOGLE' WHERE "parentId" IS NULL AND "password" IS NULL;
