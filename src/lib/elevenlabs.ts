// src/lib/elevenlabs.ts
// ─── ElevenLabs Voice Agent Integration ──────────────────────────────────────
//
// Flow:
//   1. جيب إعدادات الـ Agent (voice_id + system_prompt) من ElevenLabs
//   2. ولّد الرد النصي باستخدام الـ LLM المضمّن في الـ Agent
//   3. حوّل الرد لـ audio عبر ElevenLabs TTS بصوت الـ Agent
//   4. ارجع الـ audio buffer جاهز للإرسال على واتساب

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ElevenLabsAgentConfig {
  voiceId:      string;
  systemPrompt: string;
  agentName:    string;
  llmModel:     string;
}

export interface VoiceAgentResult {
  ok:           boolean;
  audioBuffer?: Buffer;
  textResponse?: string;
  error?:       string;
}

// ─── Default voice لو الـ Agent مش معاه voice_id ────────────────────────────
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — عربي معقول

// ─── جيب إعدادات الـ Agent من ElevenLabs ────────────────────────────────────
export async function getElevenLabsAgentConfig(
  agentId: string,
  apiKey:  string
): Promise<ElevenLabsAgentConfig | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!res.ok) {
      console.error(`[ElevenLabs] Failed to fetch agent config: ${res.status}`);
      return null;
    }

    const data = await res.json();

    const voiceId     = data?.conversation_config?.tts?.voice_id      ?? DEFAULT_VOICE_ID;
    const systemPrompt= data?.conversation_config?.agent?.prompt?.prompt ?? "";
    const agentName   = data?.name                                      ?? "Voice Agent";
    const llmModel    = data?.conversation_config?.agent?.llm           ?? "gpt-4o-mini";

    return { voiceId, systemPrompt, agentName, llmModel };
  } catch (err) {
    console.error("[ElevenLabs] getAgentConfig error:", err);
    return null;
  }
}

// ─── ولّد رد نصي من الـ Agent عبر ElevenLabs LLM API ────────────────────────
async function getAgentTextReply(
  agentId:            string,
  apiKey:             string,
  userText:           string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  try {
    // ElevenLabs Conversational AI — HTTP invoke endpoint
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}/lm/invoke`,
      {
        method:  "POST",
        headers: {
          "xi-api-key":   apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input:               userText,
          conversation_history: conversationHistory,
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[ElevenLabs] LM invoke failed (${res.status}) — falling back`);
      return null;
    }

    const data = await res.json();
    return data?.output ?? data?.text ?? null;
  } catch (err) {
    console.warn("[ElevenLabs] LM invoke error:", err);
    return null;
  }
}

// ─── حوّل النص لـ audio عبر ElevenLabs TTS ───────────────────────────────────
async function textToSpeech(
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
            stability:        0.5,
            similarity_boost: 0.75,
            style:            0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error(`[ElevenLabs] TTS failed: ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[ElevenLabs] TTS error:", err);
    return null;
  }
}

// ─── Fallback: لو ElevenLabs LM مش شغّال، استخدم OpenAI بـ system prompt الـ Agent
async function fallbackTextReply(
  systemPrompt:       string,
  userText:           string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return null;

  try {
    const messages = [
      { role: "system", content: systemPrompt || "أنت مساعد مبيعات محترف وودود." },
      ...conversationHistory.slice(-6), // آخر 6 رسائل
      { role: "user", content: userText },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        messages,
        max_tokens:  400,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────────────
export async function callVoiceAgent({
  agentId,
  apiKey,
  userText,
  conversationHistory = [],
}: {
  agentId:             string;
  apiKey:              string;
  userText:            string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}): Promise<VoiceAgentResult> {

  // Step 1: جيب إعدادات الـ Agent
  const config = await getElevenLabsAgentConfig(agentId, apiKey);
  if (!config) {
    return { ok: false, error: "فشل في جلب إعدادات الـ Agent — تأكد من الـ API Key والـ Agent ID" };
  }

  // Step 2: ولّد رد نصي
  // نجرب ElevenLabs LM أولاً، لو فشل نروح للـ fallback
  let textResponse = await getAgentTextReply(agentId, apiKey, userText, conversationHistory);

  if (!textResponse) {
    console.log("[ElevenLabs] Using OpenAI fallback for text generation");
    textResponse = await fallbackTextReply(config.systemPrompt, userText, conversationHistory);
  }

  if (!textResponse?.trim()) {
    return { ok: false, error: "الـ Agent ما ردّش — تحقق من إعداداته على ElevenLabs" };
  }

  // Step 3: حوّل الرد لصوت
  const audioBuffer = await textToSpeech(textResponse, config.voiceId, apiKey);
  if (!audioBuffer) {
    return { ok: false, error: "فشل في تحويل الرد لصوت عبر ElevenLabs TTS" };
  }

  return { ok: true, audioBuffer, textResponse };
}

// ─── Helper: رفع audio buffer على Cloudinary وإرجاع URL ──────────────────────
export async function uploadAudioToCloudinary(
  audioBuffer: Buffer,
  folder = "voice-agent-replies"
): Promise<string | null> {
  try {
    const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "ml_default";

    if (!cloudName) {
      console.error("[ElevenLabs] CLOUDINARY_CLOUD_NAME not set");
      return null;
    }

    const formData = new FormData();
    const blob     = new Blob([audioBuffer], { type: "audio/mpeg" });
    formData.append("file", blob, `voice-${Date.now()}.mp3`);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);
    formData.append("resource_type", "video"); // Cloudinary بيعامل الـ audio كـ video

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      console.error("[ElevenLabs] Cloudinary upload failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.secure_url ?? null;
  } catch (err) {
    console.error("[ElevenLabs] Cloudinary upload error:", err);
    return null;
  }
}