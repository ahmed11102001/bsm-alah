-- AddColumn: ElevenLabs Voice Agent fields on AIAgent
ALTER TABLE "AIAgent"
  ADD COLUMN IF NOT EXISTS "elevenLabsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "elevenLabsApiKey"  TEXT,
  ADD COLUMN IF NOT EXISTS "elevenLabsAgentId" TEXT;

-- AddColumn: voiceAgentEnabled on Contact
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "voiceAgentEnabled" BOOLEAN NOT NULL DEFAULT false;