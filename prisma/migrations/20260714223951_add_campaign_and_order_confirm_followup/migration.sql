-- CreateEnum
CREATE TYPE "OrderCancelReasonStage" AS ENUM ('AWAITING_REASON', 'DONE');

-- CreateEnum
CREATE TYPE "CampaignFollowUpStage" AS ENUM ('SENT', 'DONE');

-- AlterEnum
ALTER TYPE "SmartFollowUpType" ADD VALUE 'order_confirm';

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelReasonExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cancelReasonMessageId" TEXT,
ADD COLUMN     "cancelReasonStage" "OrderCancelReasonStage";

-- CreateTable
CREATE TABLE "CampaignFollowUpSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "templateId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "triggerDelayDays" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "replyDelayMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "texts" JSONB NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignFollowUpSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFollowUpRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "followUpSentAt" TIMESTAMP(3),
    "followUpMessageId" TEXT,
    "followUpStage" "CampaignFollowUpStage",
    "followUpStageExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignFollowUpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignFollowUpSetting_userId_idx" ON "CampaignFollowUpSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFollowUpSetting_userId_campaignId_key" ON "CampaignFollowUpSetting"("userId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFollowUpRecord_messageId_key" ON "CampaignFollowUpRecord"("messageId");

-- CreateIndex
CREATE INDEX "CampaignFollowUpRecord_userId_idx" ON "CampaignFollowUpRecord"("userId");

-- CreateIndex
CREATE INDEX "CampaignFollowUpRecord_customerPhone_userId_idx" ON "CampaignFollowUpRecord"("customerPhone", "userId");

-- CreateIndex
CREATE INDEX "CampaignFollowUpRecord_followUpStage_idx" ON "CampaignFollowUpRecord"("followUpStage");

-- CreateIndex
CREATE INDEX "CampaignFollowUpRecord_userId_followUpMessageId_idx" ON "CampaignFollowUpRecord"("userId", "followUpMessageId");

-- CreateIndex
CREATE INDEX "StoreOrder_cancelReasonStage_idx" ON "StoreOrder"("cancelReasonStage");

-- AddForeignKey
ALTER TABLE "CampaignFollowUpSetting" ADD CONSTRAINT "CampaignFollowUpSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFollowUpSetting" ADD CONSTRAINT "CampaignFollowUpSetting_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFollowUpRecord" ADD CONSTRAINT "CampaignFollowUpRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
