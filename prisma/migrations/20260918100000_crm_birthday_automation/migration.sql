-- AlterTable: Contact — birthday automation fields (additive only)
ALTER TABLE "Contact" ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "city" TEXT,
ADD COLUMN "lastBirthdayEmailSentAt" TIMESTAMP(3);

-- AlterTable: EmailDelivery.campaignId becomes nullable (birthday sends have no campaign)
ALTER TABLE "EmailDelivery" ALTER COLUMN "campaignId" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "EmailAutomationType" AS ENUM ('BIRTHDAY');

-- CreateTable
CREATE TABLE "EmailAutomation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EmailAutomationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAutomation_userId_type_key" ON "EmailAutomation"("userId", "type");

-- CreateIndex
CREATE INDEX "EmailAutomation_type_enabled_idx" ON "EmailAutomation"("type", "enabled");
