CREATE TYPE "SalesGoal" AS ENUM ('customer_service', 'balanced', 'sales_focused');

CREATE TABLE "SalesBehaviorSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" "SalesGoal" NOT NULL DEFAULT 'balanced',
    "suggestAlternatives" BOOLEAN NOT NULL DEFAULT true,
    "suggestUpsell" BOOLEAN NOT NULL DEFAULT true,
    "suggestCrossSell" BOOLEAN NOT NULL DEFAULT false,
    "suggestDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "maxSuggestedProducts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesBehaviorSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesBehaviorSettings_userId_key" ON "SalesBehaviorSettings"("userId");
ALTER TABLE "SalesBehaviorSettings" ADD CONSTRAINT "SalesBehaviorSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "relatedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
