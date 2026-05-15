-- ══════════════════════════════════════════════════════════════════
-- Migration: beta PlanTier → isBetaUser flag
-- شغّل ده على الـ DB قبل ما تدفع الكود الجديد
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. أضف العمود الجديد لو مش موجود
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "isBetaUser" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. اضبط isBetaUser = true للـ users اللي plan بتاعهم beta
UPDATE "Subscription"
SET    "isBetaUser" = TRUE
WHERE  "plan" = 'beta';

-- 3. حوّل الـ beta rows لـ enterprise (أو free — حسب قرارك)
UPDATE "Subscription"
SET    "plan" = 'enterprise'
WHERE  "plan" = 'beta';

-- 4. بعد ما تتأكد إن الكود الجديد اتنشر، اشيل beta من الـ enum:
--    ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";
--    CREATE TYPE "PlanTier" AS ENUM ('free', 'starter', 'pro', 'enterprise');
--    ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "PlanTier" USING "plan"::text::"PlanTier";
--    DROP TYPE "PlanTier_old";

COMMIT;