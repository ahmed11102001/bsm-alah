-- CreateEnum
CREATE TYPE "AnalyticsSource" AS ENUM ('automation_rule', 'ai_agent', 'store_automation', 'smart_followup', 'webhook', 'unknown');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('trigger', 'executed', 'failed', 'completed', 'error');

-- CreateEnum
CREATE TYPE "AnalyticsStatus" AS ENUM ('success', 'failure', 'pending');

-- CreateEnum
CREATE TYPE "AnalyticsFunnelStep" AS ENUM ('started', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "AutomationAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "automationRuleId" TEXT,
    "aiAgentId" TEXT,
    "source" "AnalyticsSource" NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "status" "AnalyticsStatus" NOT NULL DEFAULT 'success',
    "step" "AnalyticsFunnelStep",
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationAnalytics_userId_runAt_idx" ON "AutomationAnalytics"("userId", "runAt");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_userId_source_idx" ON "AutomationAnalytics"("userId", "source");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_automationRuleId_runAt_idx" ON "AutomationAnalytics"("automationRuleId", "runAt");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_aiAgentId_runAt_idx" ON "AutomationAnalytics"("aiAgentId", "runAt");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_status_idx" ON "AutomationAnalytics"("status");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_eventType_idx" ON "AutomationAnalytics"("eventType");

-- CreateIndex
CREATE INDEX "AutomationAnalytics_step_idx" ON "AutomationAnalytics"("step");

-- AddForeignKey
ALTER TABLE "AutomationAnalytics" ADD CONSTRAINT "AutomationAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAnalytics" ADD CONSTRAINT "AutomationAnalytics_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAnalytics" ADD CONSTRAINT "AutomationAnalytics_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "AIAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
