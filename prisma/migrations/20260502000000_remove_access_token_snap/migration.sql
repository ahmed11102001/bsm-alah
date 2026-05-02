-- Remove accessTokenSnap from MessageQueue
-- التوكن بيتجاب من WhatsAppAccount مباشرة وقت الإرسال

ALTER TABLE "MessageQueue" DROP COLUMN IF EXISTS "accessTokenSnap";