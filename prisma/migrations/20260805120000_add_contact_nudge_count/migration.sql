-- Conversation Nudge feature: track how many silence-nudges were sent
-- in the current thread so we cap it at one per silence period.
ALTER TABLE "Contact" ADD COLUMN "nudgeCountInThread" INTEGER NOT NULL DEFAULT 0;