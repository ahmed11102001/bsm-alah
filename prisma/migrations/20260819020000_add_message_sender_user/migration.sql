-- Track the actual team member who sent a human outbound message.
-- Message.userId remains the workspace/tenant owner for data scoping.
ALTER TABLE "Message" ADD COLUMN "senderUserId" TEXT;

CREATE INDEX "Message_senderUserId_idx" ON "Message"("senderUserId");

-- Preserve attribution for existing human outbound messages where the only
-- actor information available is the workspace owner stored in userId.
UPDATE "Message"
SET "senderUserId" = "userId"
WHERE "direction" = 'outbound'
  AND "senderType" = 'human'
  AND "senderUserId" IS NULL;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
