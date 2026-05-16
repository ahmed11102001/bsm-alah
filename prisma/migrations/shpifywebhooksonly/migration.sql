-- AlterTable ShopifyStore: make accessToken optional, remove unique from shop, add isActive

ALTER TABLE "ShopifyStore"
ALTER COLUMN "accessToken" DROP NOT NULL;

ALTER TABLE "ShopifyStore"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Remove UNIQUE constraint from shop
ALTER TABLE "ShopifyStore"
DROP CONSTRAINT IF EXISTS "ShopifyStore_shop_key";