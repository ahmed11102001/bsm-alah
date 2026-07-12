-- CreateEnum
CREATE TYPE "SmartFollowUpType" AS ENUM ('shipping', 'cart');

-- CreateEnum
CREATE TYPE "ShippingFollowUpStage" AS ENUM ('SENT', 'AWAITING_RATING', 'AWAITING_PROBLEM_DETAILS', 'DONE');

-- CreateEnum
CREATE TYPE "CartFollowUpStage" AS ENUM ('SENT', 'AWAITING_REASON', 'DONE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SMART_FOLLOWUP_ALERT';

-- AlterTable
ALTER TABLE "AbandonedCart" ADD COLUMN     "followUpMessageId" TEXT,
ADD COLUMN     "followUpReason" TEXT,
ADD COLUMN     "followUpSentAt" TIMESTAMP(3),
ADD COLUMN     "followUpStage" "CartFollowUpStage",
ADD COLUMN     "followUpStageExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "followUpMessageId" TEXT,
ADD COLUMN     "followUpRating" INTEGER,
ADD COLUMN     "followUpSentAt" TIMESTAMP(3),
ADD COLUMN     "followUpStage" "ShippingFollowUpStage",
ADD COLUMN     "followUpStageExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippedMessageId" TEXT;

-- CreateTable
CREATE TABLE "SmartFollowUpSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SmartFollowUpType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "triggerDelayDays" INTEGER NOT NULL DEFAULT 3,
    "replyDelayMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "texts" JSONB NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartFollowUpSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartFollowUpSetting_userId_idx" ON "SmartFollowUpSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartFollowUpSetting_userId_type_key" ON "SmartFollowUpSetting"("userId", "type");

-- CreateIndex
CREATE INDEX "AbandonedCart_followUpStage_idx" ON "AbandonedCart"("followUpStage");

-- CreateIndex
CREATE INDEX "AbandonedCart_userId_followUpMessageId_idx" ON "AbandonedCart"("userId", "followUpMessageId");

-- CreateIndex
CREATE INDEX "StoreOrder_followUpStage_idx" ON "StoreOrder"("followUpStage");

-- CreateIndex
CREATE INDEX "StoreOrder_userId_followUpMessageId_idx" ON "StoreOrder"("userId", "followUpMessageId");

-- AddForeignKey
ALTER TABLE "SmartFollowUpSetting" ADD CONSTRAINT "SmartFollowUpSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
