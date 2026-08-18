-- Preserve the existing applied commission rate under an explicit name
-- and add the immutable base rate captured at conversion time.
ALTER TABLE "ReferralReward" RENAME COLUMN "rate" TO "appliedRate";
ALTER TABLE "ReferralReward" ADD COLUMN "baseRate" DECIMAL(5,4) NOT NULL DEFAULT 0;

-- Historical rewards only have the old applied rate available. Preserve it
-- as the best available historical base rate without changing the reward.
UPDATE "ReferralReward" SET "baseRate" = "appliedRate" WHERE "baseRate" = 0;
