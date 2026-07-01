/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Subscription` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DeveloperNotificationType" AS ENUM ('META_UPDATE', 'BILLING', 'SECURITY', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "otp_logs" DROP CONSTRAINT "otp_logs_projectId_fkey";

-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Subscription_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "textAiEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "StoreAutomation" ADD COLUMN     "delayMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "developer_notifications" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "type" "DeveloperNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "developer_notifications_developerId_isRead_createdAt_idx" ON "developer_notifications"("developerId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "developer_notifications_developerId_createdAt_idx" ON "developer_notifications"("developerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "developer_password_reset_tokens_token_key" ON "developer_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "developer_password_reset_tokens_token_idx" ON "developer_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "developer_password_reset_tokens_developerId_idx" ON "developer_password_reset_tokens"("developerId");

-- AddForeignKey
ALTER TABLE "developer_notifications" ADD CONSTRAINT "developer_notifications_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_password_reset_tokens" ADD CONSTRAINT "developer_password_reset_tokens_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
