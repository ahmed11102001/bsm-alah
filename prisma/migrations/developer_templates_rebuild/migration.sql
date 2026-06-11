-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Developer Templates Rebuild
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. TemplateCategory enum
DO $$ BEGIN
  CREATE TYPE "TemplateCategory" AS ENUM ('AUTHENTICATION', 'UTILITY', 'MARKETING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add LOCAL_DRAFT to DeveloperTemplateStatus
DO $$ BEGIN
  ALTER TYPE "DeveloperTemplateStatus" ADD VALUE IF NOT EXISTS 'LOCAL_DRAFT';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Add new columns to developer_otp_templates
ALTER TABLE "developer_otp_templates"
  ADD COLUMN IF NOT EXISTS "category"       "TemplateCategory" NOT NULL DEFAULT 'AUTHENTICATION',
  ADD COLUMN IF NOT EXISTS "headerType"     TEXT,
  ADD COLUMN IF NOT EXISTS "headerText"     TEXT,
  ADD COLUMN IF NOT EXISTS "body"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "bodyExample"    TEXT,
  ADD COLUMN IF NOT EXISTS "footer"         TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;

-- 4. Update status default for new rows
ALTER TABLE "developer_otp_templates"
  ALTER COLUMN "status" SET DEFAULT 'LOCAL_DRAFT';

-- 5. Add index
CREATE INDEX IF NOT EXISTS "developer_otp_templates_developerId_idx"
  ON "developer_otp_templates"("developerId");