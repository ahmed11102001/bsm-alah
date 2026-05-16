-- ─── Migration: Shopify domain field + WooCommerce store ─────────────────────

-- 1. أضف storeName لـ ShopifyStore وهاجر الداتا الموجودة
ALTER TABLE "ShopifyStore"
ADD COLUMN IF NOT EXISTS "storeName" TEXT;

-- اليوزرات الموجودة: نحط اسم المتجر = الـ shop المسجل
UPDATE "ShopifyStore"
SET "storeName" = "shop"
WHERE "storeName" IS NULL;

ALTER TABLE "ShopifyStore"
ALTER COLUMN "storeName" SET NOT NULL;

ALTER TABLE "ShopifyStore"
ALTER COLUMN "storeName" SET DEFAULT '';

-- 2. تأكد إن shop unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ShopifyStore_shop_key'
  ) THEN
    ALTER TABLE "ShopifyStore"
    ADD CONSTRAINT "ShopifyStore_shop_key" UNIQUE ("shop");
  END IF;
END $$;

-- 3. إنشاء WooCommerceStore
CREATE TABLE IF NOT EXISTS "WooCommerceStore" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid(),
  "userId"        TEXT         NOT NULL,
  "storeName"     TEXT         NOT NULL,
  "storeUrl"      TEXT,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "totalSynced"   INTEGER      NOT NULL DEFAULT 0,
  "lastSyncAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WooCommerceStore_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "WooCommerceStore_userId_key"
    UNIQUE ("userId"),

  CONSTRAINT "WooCommerceStore_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
);

-- 4. إنشاء index لو مش موجود
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'WooCommerceStore_userId_idx'
  ) THEN
    CREATE INDEX "WooCommerceStore_userId_idx"
    ON "WooCommerceStore"("userId");
  END IF;
END $$;

-- 5. إضافة wooCommerceStoreId لـ StoreOrder
ALTER TABLE "StoreOrder"
ADD COLUMN IF NOT EXISTS "wooCommerceStoreId" TEXT;

-- 6. إضافة foreign key لو مش موجود
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StoreOrder_wooCommerceStoreId_fkey'
  ) THEN
    ALTER TABLE "StoreOrder"
    ADD CONSTRAINT "StoreOrder_wooCommerceStoreId_fkey"
    FOREIGN KEY ("wooCommerceStoreId")
    REFERENCES "WooCommerceStore"("id")
    ON DELETE SET NULL;
  END IF;
END $$;