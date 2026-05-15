-- AlterEnum: Add woocommerce to OrderSource
ALTER TYPE "OrderSource" ADD VALUE 'woocommerce';

-- AlterEnum: Add woocommerce to StoreType
ALTER TYPE "StoreType" ADD VALUE 'woocommerce';

-- CreateTable: WooCommerceStore
CREATE TABLE "WooCommerceStore" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "storeName"    TEXT NOT NULL,
    "storeUrl"     TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt"   TIMESTAMP(3),
    "totalSynced"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WooCommerceStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WooCommerceStore_userId_key" ON "WooCommerceStore"("userId");
CREATE INDEX "WooCommerceStore_userId_idx" ON "WooCommerceStore"("userId");

-- AddForeignKey
ALTER TABLE "WooCommerceStore" ADD CONSTRAINT "WooCommerceStore_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: StoreOrder — add wooCommerceStoreId
ALTER TABLE "StoreOrder" ADD COLUMN "wooCommerceStoreId" TEXT;
CREATE INDEX "StoreOrder_wooCommerceStoreId_idx" ON "StoreOrder"("wooCommerceStoreId");
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_wooCommerceStoreId_fkey"
    FOREIGN KEY ("wooCommerceStoreId") REFERENCES "WooCommerceStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: StoreAutomation — add wooCommerceStoreId
ALTER TABLE "StoreAutomation" ADD COLUMN "wooCommerceStoreId" TEXT;
CREATE UNIQUE INDEX "StoreAutomation_wooCommerceStoreId_type_key" ON "StoreAutomation"("wooCommerceStoreId", "type");
CREATE INDEX "StoreAutomation_wooCommerceStoreId_idx" ON "StoreAutomation"("wooCommerceStoreId");
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_wooCommerceStoreId_fkey"
    FOREIGN KEY ("wooCommerceStoreId") REFERENCES "WooCommerceStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;