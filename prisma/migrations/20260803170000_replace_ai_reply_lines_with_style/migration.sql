-- Replace the arbitrary line-count limit with a semantic response style.
ALTER TABLE "AIGuardrail" ADD COLUMN "responseStyle" TEXT NOT NULL DEFAULT 'natural';

UPDATE "AIGuardrail"
SET "responseStyle" = CASE
  WHEN "maxReplyLines" <= 2 THEN 'short'
  WHEN "maxReplyLines" >= 6 THEN 'detailed'
  ELSE 'natural'
END;

ALTER TABLE "AIGuardrail" DROP COLUMN "maxReplyLines";
