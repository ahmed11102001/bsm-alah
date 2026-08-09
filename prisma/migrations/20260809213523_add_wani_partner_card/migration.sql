-- CreateTable
CREATE TABLE "WaniPartnerCard" (
    "id" TEXT NOT NULL,
    "template" INTEGER NOT NULL DEFAULT 1,
    "brandName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaniPartnerCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaniPartnerCard_active_idx" ON "WaniPartnerCard"("active");

-- CreateIndex
CREATE INDEX "WaniPartnerCard_order_idx" ON "WaniPartnerCard"("order");
