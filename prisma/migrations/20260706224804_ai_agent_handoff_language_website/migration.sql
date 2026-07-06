-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('AUTO', 'NEEDS_HUMAN', 'HUMAN_ACTIVE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AI_HANDOFF_NEEDED';

-- AlterTable
ALTER TABLE "AIAgent" ADD COLUMN     "languageMode" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "websiteButtonText" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "aiStatus" "ConversationStatus" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "handoffAt" TIMESTAMP(3),
ADD COLUMN     "handoffReason" TEXT;
