-- ─── Remove NO_REPLY from TriggerType enum ────────────────────────────────────
-- الميزة دي كانت بدون واجهة مستخدم (backend فقط)، وتقرر إزالتها بالكامل.
-- PostgreSQL ما بيدعمش DROP VALUE من enum مباشرة، فبنعمل الخطوات دي:
--   1) نمسح أي صفوف قديمة (لو موجودة) كانت بالنوع NO_REPLY، لأنها بقت orphaned
--      (مفيش cron ولا UI بيعالجها أو بينشئها بعد كده).
--   2) نعمل rename للـ enum القديم.
--   3) ننشئ enum جديد من غير NO_REPLY.
--   4) نحوّل عمود triggerType في AutomationRule للـ enum الجديد.
--   5) نمسح الـ enum القديم.

-- Step 1: امسح أي صفوف قديمة بالنوع NO_REPLY
DELETE FROM "AutomationRule" WHERE "triggerType" = 'NO_REPLY';

-- Step 2: rename القديم
ALTER TYPE "TriggerType" RENAME TO "TriggerType_old";

-- Step 3: انشئ الجديد من غير NO_REPLY
CREATE TYPE "TriggerType" AS ENUM ('KEYWORD', 'FIRST_MESSAGE', 'TIME_BASED');

-- Step 4: حوّل العمود للنوع الجديد
ALTER TABLE "AutomationRule"
  ALTER COLUMN "triggerType" TYPE "TriggerType"
  USING ("triggerType"::text::"TriggerType");

-- Step 5: امسح النوع القديم
DROP TYPE "TriggerType_old";