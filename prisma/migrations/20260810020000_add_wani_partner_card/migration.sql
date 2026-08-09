-- CreateEnum
CREATE TYPE "WaniPartnerCardStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "WaniPartnerCard"
ADD COLUMN "userId" TEXT,
ADD COLUMN "status" "WaniPartnerCardStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;

-- NOTE: لو الجدول فيه صفوف قديمة (Rows) من غير userId، السطر ده هيفشل.
-- لازم تتأكد الجدول فاضي (أو تحدث الصفوف القديمة بـ userId يدويًا) قبل ما تشغل الميجريشن دي.
ALTER TABLE "WaniPartnerCard" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WaniPartnerCard_userId_key" ON "WaniPartnerCard"("userId");

-- CreateIndex
CREATE INDEX "WaniPartnerCard_status_idx" ON "WaniPartnerCard"("status");

-- AddForeignKey
ALTER TABLE "WaniPartnerCard" ADD CONSTRAINT "WaniPartnerCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;