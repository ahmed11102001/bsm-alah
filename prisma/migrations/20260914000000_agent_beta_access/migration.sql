-- Agent Beta Access: 5 days / 30K tokens trial for Free/Go/Pro
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaStartedAt" TIMESTAMPTZ(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaEndsAt" TIMESTAMPTZ(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaTokensLimit" INTEGER NOT NULL DEFAULT 30000;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaTokensUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaConsumed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "agentBetaExpiredNotifiedAt" TIMESTAMPTZ(3);
