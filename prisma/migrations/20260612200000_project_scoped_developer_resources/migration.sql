-- Migration: Scope MetaConnection, ApiKey, OtpTemplate, OtpLog to projects

BEGIN;

-- ── 1. developer_meta_connections ─────────────────────────────────────────

ALTER TABLE "developer_meta_connections"
  ADD COLUMN "projectId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "developer_meta_connections"
  ALTER COLUMN "projectId" DROP DEFAULT;

ALTER TABLE "developer_meta_connections"
  DROP CONSTRAINT IF EXISTS "developer_meta_connections_developerId_fkey";

DROP INDEX IF EXISTS "developer_meta_connections_developerId_key";

ALTER TABLE "developer_meta_connections"
  DROP COLUMN "developerId";

ALTER TABLE "developer_meta_connections"
  ADD CONSTRAINT "developer_meta_connections_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "developer_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "developer_meta_connections_projectId_key"
  ON "developer_meta_connections"("projectId");

-- ── 2. developer_otp_templates ────────────────────────────────────────────

ALTER TABLE "developer_otp_templates"
  ADD COLUMN "projectId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "developer_otp_templates"
  ALTER COLUMN "projectId" DROP DEFAULT;

ALTER TABLE "developer_otp_templates"
  DROP CONSTRAINT IF EXISTS "developer_otp_templates_developerId_fkey";

DROP INDEX IF EXISTS "developer_otp_templates_developerId_idx";

ALTER TABLE "developer_otp_templates"
  DROP COLUMN "developerId";

ALTER TABLE "developer_otp_templates"
  ADD CONSTRAINT "developer_otp_templates_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "developer_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "developer_otp_templates_projectId_idx"
  ON "developer_otp_templates"("projectId");

-- ── 3. developer_api_keys ─────────────────────────────────────────────────

ALTER TABLE "developer_api_keys"
  ADD COLUMN "projectId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "developer_api_keys"
  ALTER COLUMN "projectId" DROP DEFAULT;

ALTER TABLE "developer_api_keys"
  DROP CONSTRAINT IF EXISTS "developer_api_keys_developerId_fkey";

ALTER TABLE "developer_api_keys"
  DROP COLUMN "developerId";

ALTER TABLE "developer_api_keys"
  ADD CONSTRAINT "developer_api_keys_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "developer_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "developer_api_keys_projectId_idx"
  ON "developer_api_keys"("projectId");

-- ── 4. otp_logs ───────────────────────────────────────────────────────────

ALTER TABLE "otp_logs"
  ADD COLUMN "projectId" TEXT NOT NULL DEFAULT '';

ALTER TABLE "otp_logs"
  ALTER COLUMN "projectId" DROP DEFAULT;

ALTER TABLE "otp_logs"
  ADD CONSTRAINT "otp_logs_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "developer_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "otp_logs_projectId_createdAt_idx"
  ON "otp_logs"("projectId", "createdAt");

-- ── 5. developer_users ────────────────────────────────────────────────────

ALTER TABLE "developer_users"
  DROP COLUMN IF EXISTS "transferredToUserId";

COMMIT;