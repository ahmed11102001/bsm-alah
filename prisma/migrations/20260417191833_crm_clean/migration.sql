/*
  Warnings:

  - You are about to drop the column `completedAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredCount` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `failedCount` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `readCount` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `WebhookLog` table. All the data in the column will be lost.
  - You are about to drop the `Setting` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone,userId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[metaId,userId]` on the table `Template` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Contact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaId` to the `Template` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_audienceId_fkey";

-- DropIndex
DROP INDEX "Campaign_status_idx";

-- DropIndex
DROP INDEX "Contact_audienceId_idx";

-- DropIndex
DROP INDEX "Contact_phone_audienceId_key";

-- DropIndex
DROP INDEX "Message_campaignId_idx";

-- DropIndex
DROP INDEX "Message_contactId_idx";

-- DropIndex
DROP INDEX "Message_status_idx";

-- DropIndex
DROP INDEX "Message_userId_idx";

-- DropIndex
DROP INDEX "Template_status_idx";

-- DropIndex
DROP INDEX "Template_userId_idx";

-- DropIndex
DROP INDEX "WebhookLog_processed_idx";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "completedAt",
DROP COLUMN "deliveredCount",
DROP COLUMN "description",
DROP COLUMN "failedCount",
DROP COLUMN "readCount",
DROP COLUMN "scheduledAt",
DROP COLUMN "startedAt",
ALTER COLUMN "name" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "name" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "audienceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "deliveredAt",
DROP COLUMN "error",
DROP COLUMN "readAt",
DROP COLUMN "sentAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'outbound',
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "campaignId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "category",
DROP COLUMN "language",
ADD COLUMN     "metaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WebhookLog" DROP COLUMN "eventType";

-- DropTable
DROP TABLE "Setting";

-- CreateTable
CREATE TABLE "WhatsAppAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_userId_key" ON "WhatsAppAccount"("userId");

-- CreateIndex
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_userId_key" ON "Contact"("phone", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_metaId_userId_key" ON "Template"("metaId", "userId");

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
