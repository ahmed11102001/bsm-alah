-- Migration: Add developer plan + trial tracking

-- 1. Create enum
CREATE TYPE "DeveloperPlan" AS ENUM ('TRIAL', 'DEVELOPER');

-- 2. Add columns to developer_users
ALTER TABLE "developer_users"
  ADD COLUMN "plan"                "DeveloperPlan" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trialEndsAt"         TIMESTAMP(3),
  ADD COLUMN "trialMessagesUsed"   INTEGER         NOT NULL DEFAULT 0;