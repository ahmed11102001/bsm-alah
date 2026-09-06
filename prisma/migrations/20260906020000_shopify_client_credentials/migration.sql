-- Shopify Client Credentials: nullable columns only, no data loss.
-- Legacy stores (accessToken shpat_...) keep working untouched.

ALTER TABLE "ShopifyStore" ADD COLUMN "clientId" TEXT,
ADD COLUMN "clientSecret" TEXT,
ADD COLUMN "cachedAccessToken" TEXT,
ADD COLUMN "cachedTokenExpiresAt" TIMESTAMP(3);
