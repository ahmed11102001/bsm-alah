-- AddAiCredits: إضافة حقول كريديتس الذكاء الاصطناعي على Subscription
-- totalAvailable = aiPlanCredits + aiExtraCredits - aiUsedCredits

ALTER TABLE "Subscription"
  ADD COLUMN "aiPlanCredits"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiExtraCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiUsedCredits"  INTEGER NOT NULL DEFAULT 0;

-- تعيين aiPlanCredits = 1,000,000 لمشتركي enterprise الحاليين
UPDATE "Subscription"
SET "aiPlanCredits" = 1000000
WHERE plan = 'enterprise';
