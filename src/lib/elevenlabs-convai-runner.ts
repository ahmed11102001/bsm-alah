// src/lib/elevenlabs-convai-runner.ts
// ─────────────────────────────────────────────────────────────────────────
// قناة الرد الصوتي المستقلة (ElevenLabs Conversational AI — "Convai")
//
// الفرق الجوهري عن src/lib/elevenlabs.ts (القديم):
//   - القديم: TTS-only → بياخد نص جاهز اتولّد من Wani AI (Gemini/OpenAI) ويحوله لصوت بس.
//   - هنا: بنكلم عقل الـ Agent اللي العميل بناه وهيّأه بنفسه على ElevenLabs Dashboard
//     (بمعرفته الخاصة / Knowledge Base / System Prompt بتاعه هو) عن طريق جلسة
//     WebSocket حية، وهو اللي بيفكر ويحضّر الرد ويبعته صوت (ونص) — مش وني.
//
// وني هنا دوره Relay بحت:
//   1) يبعت رسالة العميل + سياق آخر رسائل المحادثة (Context)
//   2) يستنى رد الـ Agent (صوت + نص) كامل
//   3) يبعته على واتساب زي ما هو
//
// لا يتم استدعاء getAIReply ولا خصم أي AI tokens بتاعة Wani في المسار ده إطلاقاً.
//
// ⚠️ ملاحظة تقنية مهمة لازم تتأكد منها فعلياً مع حساب ElevenLabs بتاعك قبل الإطلاق:
//   شكل الصوت اللي بيرجع من الـ Convai session (output_format) بيتحدد من إعدادات
//   الـ Agent نفسه على لوحة تحكم ElevenLabs (PCM / µ-law / MP3 ...). واتساب بيقبل
//   بس: aac, mp4, mpeg, amr, أو ogg/opus. لو الـ Agent مضبوط يرجّع PCM خام، الملف
//   مش هيتشغل على واتساب غير لو اتحول أول (مثلاً عبر ffmpeg) قبل الرفع.
//   لازم تتأكد من "Output audio format" في إعدادات الـ Voice بتاع الـ Agent على
//   ElevenLabs وتظبطه لصيغة متوافقة (أو نضيف خطوة تحويل لاحقاً لو احتجنا).
// ─────────────────────────────────────────────────────────────────────────

export interface ConvaiContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConvaiVoiceResult {
  ok: boolean;
  audioBuffer?: Buffer;
  textReply?: string;
  error?: string;
}

const CONNECT_TIMEOUT_MS = 10_000;
// لو مفيش events جديدة (صوت/نص) وصلت للمدة دي بعد أول جزء من الرد، نعتبر الـ turn خلص
const SILENCE_END_MS = 1_800;
// سقف أقصى مطلق للجلسة كلها (احتياطاً من Agent معلّق أو رد طويل جداً)
const HARD_TIMEOUT_MS = 30_000;

/**
 * جلب Signed URL للاتصال بجلسة الـ Agent (لازم للـ Agents الخاصة/Private).
 * لو فشل (مثلاً الـ Agent Public)، بنرجع null ونستخدم الرابط المباشر كـ fallback.
 */
async function getSignedUrl(agentId: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.signed_url as string) ?? null;
  } catch (err) {
    console.error("[ElevenLabs-Convai] signed_url fetch error:", err);
    return null;
  }
}

/** تنسيق سياق آخر رسائل المحادثة كنص واحد لإرساله كـ Contextual Update (لا يقاطع رد الـ Agent) */
function buildContextText(contextMessages: ConvaiContextMessage[]): string {
  if (!contextMessages.length) return "";
  const lines = contextMessages
    .slice(-12)
    .map((m) => `${m.role === "user" ? "العميل" : "الرد السابق من الـ Agent"}: ${m.content}`);
  return `سياق آخر رسائل المحادثة على واتساب (للعلم فقط — رد أنت على آخر رسالة جديدة من العميل):\n${lines.join("\n")}`;
}

/**
 * تشغيل turn واحد كامل مع الـ ElevenLabs Conversational Agent:
 * فتح جلسة WebSocket → بعت السياق + رسالة العميل → استقبال الرد (صوت + نص) → قفل الجلسة.
 */
export async function runConvaiVoiceReply({
  apiKey,
  agentId,
  userMessage,
  contextMessages,
}: {
  apiKey: string;
  agentId: string;
  userMessage: string;
  contextMessages: ConvaiContextMessage[];
}): Promise<ConvaiVoiceResult> {
  if (!userMessage?.trim()) {
    return { ok: false, error: "رسالة العميل فاضية" };
  }
  if (!agentId?.trim()) {
    return { ok: false, error: "لا يوجد Agent ID مربوط في إعدادات التكامل" };
  }
  if (!apiKey?.trim()) {
    return { ok: false, error: "لا يوجد ElevenLabs API Key" };
  }

  const trimmedAgentId = agentId.trim();
  const signedUrl = await getSignedUrl(trimmedAgentId, apiKey.trim());
  const wsUrl =
    signedUrl ??
    `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(trimmedAgentId)}`;

  return new Promise<ConvaiVoiceResult>((resolve) => {
    let settled = false;
    let ws: WebSocket;
    const audioChunks: Buffer[] = [];
    let collectedText = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (hardTimer) clearTimeout(hardTimer);
      if (connectTimer) clearTimeout(connectTimer);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    };

    const finish = (result: ConvaiVoiceResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const finalizeFromBuffer = (fallbackError: string) => {
      if (audioChunks.length > 0) {
        finish({
          ok: true,
          audioBuffer: Buffer.concat(audioChunks),
          textReply: collectedText.trim() || undefined,
        });
      } else {
        finish({ ok: false, error: fallbackError });
      }
    };

    const armSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        finalizeFromBuffer("لم يصل رد صوتي من الـ Agent");
      }, SILENCE_END_MS);
    };

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finish({ ok: false, error: `فشل فتح اتصال WebSocket: ${err}` });
      return;
    }

    hardTimer = setTimeout(() => {
      finalizeFromBuffer("انتهت المهلة القصوى قبل استلام رد كامل");
    }, HARD_TIMEOUT_MS);

    connectTimer = setTimeout(() => {
      finish({ ok: false, error: "فشل الاتصال بـ ElevenLabs Convai (timeout)" });
    }, CONNECT_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      if (connectTimer) clearTimeout(connectTimer);

      try {
        // تهيئة الجلسة — بنسيب إعدادات الصوت/الموديل زي ما هي مظبوطة في لوحة تحكم الـ Agent
        ws.send(JSON.stringify({ type: "conversation_initiation_client_data" }));

        // سياق آخر رسائل المحادثة (Contextual Update — لا يعتبر turn ولا يقاطع الـ Agent)
        const contextText = buildContextText(contextMessages);
        if (contextText) {
          ws.send(JSON.stringify({ type: "contextual_update", text: contextText }));
        }

        // رسالة العميل الفعلية — دي اللي المفروض الـ Agent يرد عليها بصوته وعقله هو
        ws.send(JSON.stringify({ type: "user_message", text: userMessage.trim() }));
      } catch (err) {
        finish({ ok: false, error: `فشل إرسال البيانات للـ Agent: ${err}` });
      }
    });

    ws.addEventListener("message", (event: MessageEvent) => {
      let data: any;
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (data?.type) {
        case "ping": {
          // لازم نرد بـ pong بنفس الـ event_id عشان الجلسة تفضل مفتوحة أثناء التفكير/التوليد
          const eventId = data?.ping_event?.event_id;
          try {
            ws.send(JSON.stringify({ type: "pong", event_id: eventId }));
          } catch {
            /* noop */
          }
          break;
        }
        case "audio": {
          const b64 = data?.audio_event?.audio_base_64;
          if (b64) {
            audioChunks.push(Buffer.from(b64, "base64"));
            armSilenceTimer();
          }
          break;
        }
        case "agent_response": {
          const text = data?.agent_response_event?.agent_response;
          if (text) {
            collectedText += (collectedText ? " " : "") + text;
            armSilenceTimer();
          }
          break;
        }
        // أحداث بنتجاهلها عمداً لأننا شغالين بـ turn واحد فقط لكل رسالة واتساب
        case "interruption":
        case "agent_response_correction":
        case "conversation_initiation_metadata":
        case "vad_score":
        case "user_transcript":
          break;
        default:
          break;
      }
    });

    ws.addEventListener("error", (err: Event) => {
      console.error("[ElevenLabs-Convai] WebSocket error:", err);
      if (audioChunks.length === 0) {
        finish({ ok: false, error: "خطأ في الاتصال بـ ElevenLabs Convai" });
      }
    });

    ws.addEventListener("close", () => {
      finalizeFromBuffer("الاتصال اتقفل من غير أي رد صوتي");
    });
  });
}
