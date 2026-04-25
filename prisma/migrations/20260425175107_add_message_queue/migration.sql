-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('pending', 'processing', 'sent', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "queuedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQueued" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodEnd" SET DEFAULT NOW() + INTERVAL '100 years';

-- AlterTable
ALTER TABLE "WhatsAppAccount" ADD COLUMN     "backoffCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "backoffUntil" TIMESTAMP(3),
ADD COLUMN     "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dailySentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagingTier" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "MessageQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappAccountId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessTokenSnap" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "contactId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'template',
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'ar',
    "templateVars" JSONB,
    "content" TEXT,
    "campaignId" TEXT,
    "status" "QueueStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "whatsappMsgId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageQueue_status_scheduledAt_idx" ON "MessageQueue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MessageQueue_phoneNumberId_status_idx" ON "MessageQueue"("phoneNumberId", "status");

-- CreateIndex
CREATE INDEX "MessageQueue_campaignId_idx" ON "MessageQueue"("campaignId");

-- CreateIndex
CREATE INDEX "MessageQueue_userId_status_idx" ON "MessageQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "MessageQueue_status_nextRetryAt_idx" ON "MessageQueue"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "Campaign_scheduled_at_idx" ON "Campaign"("scheduled_at");

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_whatsappAccountId_fkey" FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
