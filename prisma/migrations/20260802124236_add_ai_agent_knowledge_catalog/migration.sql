-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('shopify', 'easyorders', 'woocommerce', 'manual');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('return_policy', 'shipping_policy', 'payment_policy', 'warranty_policy', 'privacy_policy', 'custom');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ProductSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "compareAtPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variants" JSONB,
    "stock" INTEGER,
    "url" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandFAQ" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandFAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PolicyType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGuardrail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noInventPrices" BOOLEAN NOT NULL DEFAULT true,
    "noInventProducts" BOOLEAN NOT NULL DEFAULT true,
    "noMentionCompetitors" BOOLEAN NOT NULL DEFAULT true,
    "noSharePersonal" BOOLEAN NOT NULL DEFAULT true,
    "strictKnowledgeOnly" BOOLEAN NOT NULL DEFAULT true,
    "alwaysHandoffComplaints" BOOLEAN NOT NULL DEFAULT true,
    "maxReplyLines" INTEGER NOT NULL DEFAULT 3,
    "customRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGuardrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ProductSource" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "productsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProductSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_userId_isActive_idx" ON "Product"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Product_userId_source_idx" ON "Product"("userId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Product_source_externalId_userId_key" ON "Product"("source", "externalId", "userId");

-- CreateIndex
CREATE INDEX "BrandFAQ_userId_idx" ON "BrandFAQ"("userId");

-- CreateIndex
CREATE INDEX "BrandPolicy_userId_idx" ON "BrandPolicy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIGuardrail_userId_key" ON "AIGuardrail"("userId");

-- CreateIndex
CREATE INDEX "ProductSyncLog_userId_source_idx" ON "ProductSyncLog"("userId", "source");

-- CreateIndex
CREATE INDEX "ProductSyncLog_userId_startedAt_idx" ON "ProductSyncLog"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandFAQ" ADD CONSTRAINT "BrandFAQ_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPolicy" ADD CONSTRAINT "BrandPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGuardrail" ADD CONSTRAINT "AIGuardrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSyncLog" ADD CONSTRAINT "ProductSyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
