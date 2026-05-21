-- Migration: AI Token Quota System
-- Adds monthly token usage counter + permanent bonus balance to Subscription

ALTER TABLE "Subscription"
  ADD COLUMN "aiTokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiTokensBonusBalance"  INTEGER NOT NULL DEFAULT 0;