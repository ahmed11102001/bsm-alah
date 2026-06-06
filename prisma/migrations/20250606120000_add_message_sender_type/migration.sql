-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('human', 'ai', 'bot', 'system');

-- AlterTable Message: add senderType column with default 'human'
ALTER TABLE "Message" ADD COLUMN "senderType" "MessageSenderType" NOT NULL DEFAULT 'human';

-- AlterTable Contact: add lastAiRepliedAt column
ALTER TABLE "Contact" ADD COLUMN "lastAiRepliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_senderType_idx" ON "Message"("senderType");