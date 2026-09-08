-- Template ↔ WhatsAppAccount link: which account owns each template.
-- Nullable: existing rows stay NULL (legacy, shown cautiously + accepted).

ALTER TABLE "Template" ADD COLUMN "whatsappAccountId" TEXT;
ALTER TABLE "Template" ADD COLUMN "wabaId" TEXT;

CREATE INDEX IF NOT EXISTS "Template_whatsappAccountId_idx" ON "Template"("whatsappAccountId");
CREATE INDEX IF NOT EXISTS "Template_wabaId_idx" ON "Template"("wabaId");

DO $$ BEGIN
    ALTER TABLE "Template" ADD CONSTRAINT "Template_whatsappAccountId_fkey"
        FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
