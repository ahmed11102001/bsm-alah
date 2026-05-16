-- currentPeriodEnd: DateTime → DateTime? (nullable)
-- free plan = null بدل 2099

ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;

-- تصفير القيم الوهمية (2099 و +100 سنة) للـ free plan
UPDATE "Subscription"
SET "currentPeriodEnd" = NULL
WHERE
  plan = 'free'
  AND (
    "currentPeriodEnd" > NOW() + INTERVAL '50 years'
  );