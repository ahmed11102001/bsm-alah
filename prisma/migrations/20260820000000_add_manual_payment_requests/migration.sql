-- Manual Payment System: PaymentRequest model

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentRequestType" AS ENUM ('subscription', 'token_package', 'mcp_addon');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Subscription (none — mcp_addon reuses the existing
-- mcpCommandsUsedThisMonth decrement trick, see src/lib/plan-guard.ts)

-- CreateTable PaymentRequest
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "type"            "PaymentRequestType" NOT NULL,
    "planSlug"        TEXT,
    "cycle"           TEXT,
    "packageId"       TEXT,
    "productName"     TEXT NOT NULL,
    "amount"          INTEGER NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'EGP',
    "paymentMethod"   TEXT,
    "status"          "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"      TIMESTAMP(3),
    "reviewedById"    TEXT,
    "rejectionReason" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentRequest_userId_idx" ON "PaymentRequest"("userId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_idx" ON "PaymentRequest"("status");
CREATE INDEX IF NOT EXISTS "PaymentRequest_userId_status_idx" ON "PaymentRequest"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentRequest_createdAt_idx" ON "PaymentRequest"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_reviewedById_fkey"
        FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
