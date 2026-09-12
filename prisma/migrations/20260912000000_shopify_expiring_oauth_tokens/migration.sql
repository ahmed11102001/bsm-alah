-- Shopify expiring offline OAuth tokens (mandatory for Public Apps before
-- Jan 1, 2027): nullable columns only, no data loss.
-- Existing legacy_token / client_credentials stores keep working untouched.

ALTER TABLE "ShopifyStore" ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);