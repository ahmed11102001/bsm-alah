-- AI reply pending signal: set when an AI reply is scheduled (debounce),
-- cleared when it completes, fails, or is superseded. Nullable → instant,
-- no backfill needed. Powers the "AI is preparing a reply…" indicator in chat.

ALTER TABLE "Contact" ADD COLUMN "aiReplyPendingAt" TIMESTAMP(3);
