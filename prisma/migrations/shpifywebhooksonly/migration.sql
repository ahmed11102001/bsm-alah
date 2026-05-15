-- AlterTable ShopifyStore: make accessToken optional, remove @unique from shop, add isActive
ALTER TABLE "ShopifyStore" ALTER COLUMN "accessToken" DROP NOT NULL;
ALTER TABLE "ShopifyStore" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Drop the unique index on shop (userId is already unique per user)
DROP INDEX IF EXISTS "ShopifyStore_shop_key";