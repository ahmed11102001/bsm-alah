ALTER TABLE "WooCommerceStore" ADD COLUMN "consumerKey" TEXT;
ALTER TABLE "WooCommerceStore" ADD COLUMN "consumerSecret" TEXT;
ALTER TABLE "WooCommerceStore" ADD COLUMN "isConnected" BOOLEAN NOT NULL DEFAULT false;
