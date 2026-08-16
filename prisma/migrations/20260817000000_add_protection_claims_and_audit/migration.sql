-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ProtectionClaimStatus" AS ENUM ('NEEDS_REVIEW', 'ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING_EVIDENCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Message
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "automationRuleId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_automationRuleId_idx" ON "Message"("automationRuleId");

-- AddForeignKey Message -> AutomationRule
DO $$ BEGIN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable ProtectionClaim
CREATE TABLE IF NOT EXISTS "ProtectionClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappAccountId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banDetectedAt" TIMESTAMP(3) NOT NULL,
    "status" "ProtectionClaimStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "refundAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "refundStatus" TEXT NOT NULL DEFAULT 'NONE',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "adminNotes" TEXT,
    "customerNotes" TEXT,
    "evidenceSnapshot" JSONB,
    "evidenceFiles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtectionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProtectionAuditLog
CREATE TABLE IF NOT EXISTS "ProtectionAuditLog" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtectionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex ProtectionClaim
CREATE INDEX IF NOT EXISTS "ProtectionClaim_userId_idx" ON "ProtectionClaim"("userId");
CREATE INDEX IF NOT EXISTS "ProtectionClaim_whatsappAccountId_idx" ON "ProtectionClaim"("whatsappAccountId");
CREATE INDEX IF NOT EXISTS "ProtectionClaim_phoneNumber_idx" ON "ProtectionClaim"("phoneNumber");
CREATE INDEX IF NOT EXISTS "ProtectionClaim_status_idx" ON "ProtectionClaim"("status");
CREATE INDEX IF NOT EXISTS "ProtectionClaim_createdAt_idx" ON "ProtectionClaim"("createdAt");

-- CreateIndex ProtectionAuditLog
CREATE INDEX IF NOT EXISTS "ProtectionAuditLog_claimId_idx" ON "ProtectionAuditLog"("claimId");
CREATE INDEX IF NOT EXISTS "ProtectionAuditLog_adminUserId_idx" ON "ProtectionAuditLog"("adminUserId");
CREATE INDEX IF NOT EXISTS "ProtectionAuditLog_createdAt_idx" ON "ProtectionAuditLog"("createdAt");

-- AddForeignKey ProtectionClaim -> User
DO $$ BEGIN
    ALTER TABLE "ProtectionClaim" ADD CONSTRAINT "ProtectionClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey ProtectionClaim -> WhatsAppAccount
DO $$ BEGIN
    ALTER TABLE "ProtectionClaim" ADD CONSTRAINT "ProtectionClaim_whatsappAccountId_fkey" FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey ProtectionClaim -> Reviewer User
DO $$ BEGIN
    ALTER TABLE "ProtectionClaim" ADD CONSTRAINT "ProtectionClaim_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey ProtectionAuditLog -> ProtectionClaim
DO $$ BEGIN
    ALTER TABLE "ProtectionAuditLog" ADD CONSTRAINT "ProtectionAuditLog_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProtectionClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey ProtectionAuditLog -> Admin User
DO $$ BEGIN
    ALTER TABLE "ProtectionAuditLog" ADD CONSTRAINT "ProtectionAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
