/*
  Warnings:

  - You are about to drop the column `appliedRate` on the `ReferralReward` table. All the data in the column will be lost.
  - You are about to drop the column `baseRate` on the `ReferralReward` table. All the data in the column will be lost.
  - Added the required column `rate` to the `ReferralReward` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeamInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_MEMBER_JOINED';

-- DropIndex
DROP INDEX "Message_replyToMessageId_idx";

-- DropIndex
DROP INDEX "WhatsAppAccount_tokenStatus_lastTokenCheckAt_idx";

-- AlterTable
ALTER TABLE "ReferralReward" DROP COLUMN "appliedRate",
DROP COLUMN "baseRate",
ADD COLUMN     "rate" DECIMAL(5,4) NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "aiTokensBonusExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CHAT_ONLY',
    "codeHash" TEXT NOT NULL,
    "status" "TeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamInvitation_inviterId_status_idx" ON "TeamInvitation"("inviterId", "status");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_status_idx" ON "TeamInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "TeamInvitation_expiresAt_idx" ON "TeamInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
