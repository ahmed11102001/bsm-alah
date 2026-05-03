-- ─── Brand fields on User ────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "brandName"       TEXT,
  ADD COLUMN IF NOT EXISTS "businessDesc"    TEXT,
  ADD COLUMN IF NOT EXISTS "productsInfo"    TEXT,
  ADD COLUMN IF NOT EXISTS "pricingInfo"     TEXT,
  ADD COLUMN IF NOT EXISTS "workingHours"    TEXT,
  ADD COLUMN IF NOT EXISTS "aiTone"          TEXT NOT NULL DEFAULT 'friendly';

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE "TriggerType" AS ENUM ('KEYWORD', 'FIRST_MESSAGE', 'NO_REPLY', 'TIME_BASED');
CREATE TYPE "ReplyType"   AS ENUM ('TEXT', 'TEMPLATE', 'AI');

-- ─── AutomationRule ───────────────────────────────────────────────────────────
CREATE TABLE "AutomationRule" (
  "id"                TEXT        NOT NULL DEFAULT gen_random_uuid(),
  "userId"            TEXT        NOT NULL,
  "name"              TEXT        NOT NULL,
  "isEnabled"         BOOLEAN     NOT NULL DEFAULT true,

  -- Trigger
  "triggerType"       "TriggerType" NOT NULL,
  "triggerValue"      TEXT,        -- keyword text OR number of days for NO_REPLY

  -- Reply
  "replyType"         "ReplyType" NOT NULL,
  "replyContent"      TEXT,        -- static text
  "templateId"        TEXT,        -- FK to Template
  "extraInstructions" TEXT,        -- per-rule AI customization

  -- Human takeover
  "humanKeywords"     TEXT[]      NOT NULL DEFAULT '{}',
  "pauseOnReply"      BOOLEAN     NOT NULL DEFAULT true,

  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX "AutomationRule_userId_isEnabled_idx" ON "AutomationRule"("userId", "isEnabled");
CREATE INDEX "AutomationRule_triggerType_idx"       ON "AutomationRule"("triggerType");

-- ─── FK ───────────────────────────────────────────────────────────────────────
ALTER TABLE "AutomationRule"
  ADD CONSTRAINT "AutomationRule_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;