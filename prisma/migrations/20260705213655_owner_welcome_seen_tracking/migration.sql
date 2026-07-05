/*
  Warnings:

  - You are about to drop the column `plan` on the `developer_users` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndsAt` on the `developer_users` table. All the data in the column will be lost.
  - You are about to drop the column `trialMessagesUsed` on the `developer_users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "DeveloperNotificationType" ADD VALUE 'TRIAL_WARNING';

-- AlterTable
ALTER TABLE "developer_projects" ADD COLUMN     "ownerWelcomeSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "developer_users" DROP COLUMN "plan",
DROP COLUMN "trialEndsAt",
DROP COLUMN "trialMessagesUsed";
