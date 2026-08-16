-- AlterEnum
ALTER TYPE "ReplyType" ADD VALUE IF NOT EXISTS 'INTERACTIVE_MENU';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AutomationInteractionState" AS ENUM ('WAITING', 'SUPERSEDED', 'COMPLETED', 'STALE', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "interactiveConfig" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AutomationInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "whatsappAccountId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "outboundMessageId" TEXT,
    "buttonSnapshot" JSONB NOT NULL,
    "state" "AutomationInteractionState" NOT NULL DEFAULT 'WAITING',
    "selectedButtonId" TEXT,
    "processedEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AutomationInteraction_processedEventId_key" ON "AutomationInteraction"("processedEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationInteraction_userId_contactId_state_idx" ON "AutomationInteraction"("userId", "contactId", "state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationInteraction_contactId_state_createdAt_idx" ON "AutomationInteraction"("contactId", "state", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationInteraction_whatsappAccountId_phoneNumberId_idx" ON "AutomationInteraction"("whatsappAccountId", "phoneNumberId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationInteraction_automationRuleId_idx" ON "AutomationInteraction"("automationRuleId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "AutomationInteraction" ADD CONSTRAINT "AutomationInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AutomationInteraction" ADD CONSTRAINT "AutomationInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AutomationInteraction" ADD CONSTRAINT "AutomationInteraction_whatsappAccountId_fkey" FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AutomationInteraction" ADD CONSTRAINT "AutomationInteraction_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
