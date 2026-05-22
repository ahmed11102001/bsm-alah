// src/lib/elevenlabs.ts
// ─── ElevenLabs Voice Integration ────────────────────────────────────────────
//
// المهمة الوحيدة: نص جاهز → صوت (TTS فقط)
// توليد النص يتم عبر getAIReply (Gemini/OpenAI) في webhook — مش هنا
//
// Flow الصح:
//   webhook → getAIReply → نص (+ يتحسب في tokens) → textToSpeech → audio → WhatsApp

export interface VoiceAgentResult {
  ok:           boolean;
  audioBuffer?: Buffer;
  error?:       string;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// ─── جيب الـ voice_id من إعدادات الـ Agent على ElevenLabs ───────────────────
export async function getElevenLabsVoiceId(
  agentId: string,
  apiKey:  string
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return DEFAULT_VOICE_ID;
    const data = await res.json();
    return data?.conversation_config?.tts?.voice_id ?? DEFAULT_VOICE_ID;
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

// ─── نص → audio buffer ───────────────────────────────────────────────────────
export async function textToSpeech(
  text:    string,
  voiceId: string,
  apiKey:  string
): Promise<Buffer | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":   apiKey,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability:         0.5,
            similarity_boost:  0.75,
            style:             0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) {
      console.error(`[ElevenLabs] TTS failed: ${res.status} — ${await res.text()}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("[ElevenLabs] TTS error:", err);
    return null;
  }
}

// ─── الدالة الرئيسية: نص جاهز → audio buffer ─────────────────────────────────
// textReply بييجي من getAIReply في webhook — مش بيتولّد هنا
export async function callVoiceAgent({
  agentId,
  apiKey,
  textReply,
}: {
  agentId:   string;
  apiKey:    string;
  textReply: string;
}): Promise<VoiceAgentResult> {
  if (!textReply?.trim())
    return { ok: false, error: "النص فاضي" };

  const voiceId     = await getElevenLabsVoiceId(agentId, apiKey);
  const audioBuffer = await textToSpeech(textReply, voiceId, apiKey);

  if (!audioBuffer)
    return { ok: false, error: "فشل في تحويل النص لصوت" };

  return { ok: true, audioBuffer };
}

// ─── رفع audio buffer على Cloudinary ─────────────────────────────────────────
export async function uploadAudioToCloudinary(
  audioBuffer: Buffer,
  folder = "voice-agent-replies"
): Promise<string | null> {
  try {
    const cloudName    = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "ml_default";
    if (!cloudName) return null;

    const formData = new FormData();
    formData.append("file",          new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" }), `voice-${Date.now()}.mp3`);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder",        folder);
    formData.append("resource_type", "video");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) return null;
    return (await res.json()).secure_url ?? null;
  } catch (err) {
    console.error("[ElevenLabs] Cloudinary error:", err);
    return null;
  }
}