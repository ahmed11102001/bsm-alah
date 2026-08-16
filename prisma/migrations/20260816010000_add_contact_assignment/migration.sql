ALTER TABLE "Contact" ADD COLUMN "assignedToUserId" TEXT;
CREATE INDEX "Contact_assignedToUserId_idx" ON "Contact"("assignedToUserId");
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
