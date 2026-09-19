-- AlterEnum: add SCHEDULED
-- (ADD VALUE can't run inside migrate's transaction — full enum swap instead)
-- NOTE: the "status" column has DEFAULT 'DRAFT' — Postgres can't auto-cast a
-- column default to the new type (error 42804), so DROP it before the swap
-- and SET it back afterwards.
ALTER TABLE "EmailCampaign" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "EmailCampaignStatus_new" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'COMPLETED', 'FAILED');
ALTER TABLE "EmailCampaign" ALTER COLUMN "status" TYPE "EmailCampaignStatus_new" USING "status"::text::"EmailCampaignStatus_new";
ALTER TYPE "EmailCampaignStatus" RENAME TO "EmailCampaignStatus_old";
ALTER TYPE "EmailCampaignStatus_new" RENAME TO "EmailCampaignStatus";
DROP TYPE "EmailCampaignStatus_old";
ALTER TABLE "EmailCampaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
