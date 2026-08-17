-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AffiliateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REVERSED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'APPROVED', 'REVERSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReferralLedgerType" AS ENUM ('EARNED', 'APPLIED_TO_INVOICE', 'REVERSED', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable Affiliate
CREATE TABLE IF NOT EXISTS "Affiliate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable Referral
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "clickedAt" TIMESTAMP(3),
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReferralReward
CREATE TABLE IF NOT EXISTS "ReferralReward" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentInvoiceId" TEXT,
    "rate" DECIMAL(5,4) NOT NULL,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "rewardAmount" DECIMAL(10,2) NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'APPROVED',
    "appliedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReferralLedgerEntry
CREATE TABLE IF NOT EXISTS "ReferralLedgerEntry" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "type" "ReferralLedgerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_userId_key" ON "Affiliate"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_code_key" ON "Affiliate"("code");
CREATE INDEX IF NOT EXISTS "Affiliate_code_idx" ON "Affiliate"("code");
CREATE INDEX IF NOT EXISTS "Affiliate_status_idx" ON "Affiliate"("status");
CREATE INDEX IF NOT EXISTS "Affiliate_userId_idx" ON "Affiliate"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX IF NOT EXISTS "Referral_affiliateId_idx" ON "Referral"("affiliateId");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_paymentInvoiceId_key" ON "ReferralReward"("paymentInvoiceId");
CREATE INDEX IF NOT EXISTS "ReferralReward_affiliateId_idx" ON "ReferralReward"("affiliateId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referralId_idx" ON "ReferralReward"("referralId");
CREATE INDEX IF NOT EXISTS "ReferralReward_status_idx" ON "ReferralReward"("status");

CREATE INDEX IF NOT EXISTS "ReferralLedgerEntry_affiliateId_createdAt_idx" ON "ReferralLedgerEntry"("affiliateId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReferralLedgerEntry" ADD CONSTRAINT "ReferralLedgerEntry_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
