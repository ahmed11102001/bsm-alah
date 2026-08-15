CREATE TYPE "WhatsAppTokenStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'INVALID', 'UNKNOWN');

ALTER TABLE "WhatsAppAccount"
  ADD COLUMN "tokenStatus" "WhatsAppTokenStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastTokenCheckAt" TIMESTAMP(3),
  ADD COLUMN "tokenDataAccessExpiresAt" TIMESTAMP(3),
  ADD COLUMN "tokenWarning7SentAt" TIMESTAMP(3),
  ADD COLUMN "tokenWarning3SentAt" TIMESTAMP(3),
  ADD COLUMN "tokenWarning1SentAt" TIMESTAMP(3),
  ADD COLUMN "tokenExpiredNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "tokenInvalidNotifiedAt" TIMESTAMP(3);

CREATE INDEX "WhatsAppAccount_tokenStatus_lastTokenCheckAt_idx"
  ON "WhatsAppAccount"("tokenStatus", "lastTokenCheckAt");
