-- Allow up to 10 WANI Partner cards per user instead of one.
DROP INDEX IF EXISTS "WaniPartnerCard_userId_key";

CREATE INDEX IF NOT EXISTS "WaniPartnerCard_userId_idx" ON "WaniPartnerCard"("userId");
