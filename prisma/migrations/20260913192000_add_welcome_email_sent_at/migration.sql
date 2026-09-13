-- AlterTable: add welcomeEmailSentAt to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "welcomeEmailSentAt" TIMESTAMP(3);

-- Backfill: All existing users who already verified email or completed onboarding are marked as already sent
UPDATE "User"
SET "welcomeEmailSentAt" = NOW()
WHERE "emailVerified" IS NOT NULL OR "onboardingCompleted" = true;
