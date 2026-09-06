-- Developer manual payments: link PaymentRequest to DeveloperUser/DeveloperProject

-- AlterEnum: add developer_owner_plan
ALTER TYPE "PaymentRequestType" ADD VALUE IF NOT EXISTS 'developer_owner_plan';

-- AlterTable: userId becomes nullable + new developer columns
ALTER TABLE "PaymentRequest" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "developerUserId" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "developerProjectId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentRequest_developerUserId_idx" ON "PaymentRequest"("developerUserId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_developerUserId_status_idx" ON "PaymentRequest"("developerUserId", "status");

-- AddForeignKey: developerUser (cascade) + developerProject (set null)
DO $$ BEGIN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_developerUserId_fkey"
        FOREIGN KEY ("developerUserId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_developerProjectId_fkey"
        FOREIGN KEY ("developerProjectId") REFERENCES "developer_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
