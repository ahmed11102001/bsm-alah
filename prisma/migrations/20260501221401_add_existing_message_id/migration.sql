-- AlterTable
ALTER TABLE "MessageQueue" ADD COLUMN     "existingMessageId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodEnd" SET DEFAULT NOW() + INTERVAL '100 years';
