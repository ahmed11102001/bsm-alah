-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeveloperNotificationType" ADD VALUE 'PLAN_EXPIRING_SOON';
ALTER TYPE "DeveloperNotificationType" ADD VALUE 'PLAN_EXPIRED';

-- AlterTable
ALTER TABLE "developer_projects" ADD COLUMN     "planExpiredNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "planExpiringNotifiedAt" TIMESTAMP(3);
