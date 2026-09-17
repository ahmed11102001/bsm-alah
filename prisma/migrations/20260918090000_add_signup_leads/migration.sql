-- CreateTable
CREATE TABLE "signup_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "googleSub" TEXT,
    "source" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "stage" TEXT NOT NULL DEFAULT 'EMAIL_PICKED',
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resumeTokenHash" TEXT,
    "resumeExpiresAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "reminderAttempts" INTEGER NOT NULL DEFAULT 0,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signup_leads_email_key" ON "signup_leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "signup_leads_resumeTokenHash_key" ON "signup_leads"("resumeTokenHash");

-- CreateIndex
CREATE INDEX "signup_leads_status_createdAt_idx" ON "signup_leads"("status", "createdAt");
