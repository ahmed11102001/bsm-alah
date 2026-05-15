-- Migration: user soft-delete + isBetaUser flag
-- Generated manually to fix failed "user" migration

-- 1. Soft-delete fields on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

-- 2. Index for fast active-user filtering
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");

-- 3. isBetaUser flag on Subscription (internal — not a PlanTier)
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "isBetaUser" BOOLEAN NOT NULL DEFAULT false;

-- 4. Remove beta from PlanTier enum
--    Step A: migrate existing beta rows to enterprise first
UPDATE "Subscription" SET "isBetaUser" = true        WHERE "plan" = 'beta';
UPDATE "Subscription" SET "plan"       = 'enterprise' WHERE "plan" = 'beta';

--    Step B: drop the DEFAULT on plan so ALTER TYPE can proceed
ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;

--    Step C: recreate enum without beta
ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";
CREATE TYPE "PlanTier" AS ENUM ('free', 'starter', 'pro', 'enterprise');
ALTER TABLE "Subscription"
  ALTER COLUMN "plan" TYPE "PlanTier"
  USING "plan"::text::"PlanTier";
DROP TYPE "PlanTier_old";

--    Step D: restore the default with the new type
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'free';