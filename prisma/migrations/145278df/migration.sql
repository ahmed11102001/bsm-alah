-- ─── Migration: نقل بيانات AI من User إلى AIAgent ───────────────────────────
-- الخطوة 1: نقل بيانات المستخدمين اللي عندهم brand data في User
--           بس مش عندهم AIAgent record بعد
INSERT INTO "AIAgent" (
  id,
  "userId",
  "isEnabled",
  "provider",
  "brandName",
  "businessDesc",
  "productsInfo",
  "pricingInfo",
  "workingHours",
  "tone",
  "pauseMinutes",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  u.id,
  false,
  'gemini',
  u."brandName",
  u."businessDesc",
  u."productsInfo",
  u."pricingInfo",
  u."workingHours",
  u."aiTone",
  10,
  NOW(),
  NOW()
FROM "User" u
WHERE (u."businessDesc" IS NOT NULL AND u."businessDesc" != '')
  AND NOT EXISTS (
    SELECT 1 FROM "AIAgent" a WHERE a."userId" = u.id
  );

-- الخطوة 2: تحديث الـ AIAgent الموجودة — لو User فيها بيانات أحدث
-- (نحافظ على AIAgent data لو موجودة، ونتجاهل User data)
-- لا نعمل UPDATE هنا عشان AIAgent هي المصدر الحقيقي

-- الخطوة 3: حذف الحقول من User
ALTER TABLE "User" DROP COLUMN IF EXISTS "brandName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "businessDesc";
ALTER TABLE "User" DROP COLUMN IF EXISTS "productsInfo";
ALTER TABLE "User" DROP COLUMN IF EXISTS "pricingInfo";
ALTER TABLE "User" DROP COLUMN IF EXISTS "workingHours";
ALTER TABLE "User" DROP COLUMN IF EXISTS "aiTone";