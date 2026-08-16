ALTER TABLE "Message" ADD COLUMN "replyToMessageId" TEXT;
ALTER TABLE "MessageQueue" ADD COLUMN "replyToWhatsappId" TEXT;
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
