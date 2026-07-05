-- AlterEnum
ALTER TYPE "DeveloperPlan" ADD VALUE 'OWNER_PLAN';

-- AlterTable
ALTER TABLE "developer_projects" ADD COLUMN     "plan" "DeveloperPlan" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "planRenewsAt" TIMESTAMP(3),
ADD COLUMN     "planStartedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "trialMessagesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialStartedAt" TIMESTAMP(3),
ADD COLUMN     "trialWarningNotifiedAt" TIMESTAMP(3);
