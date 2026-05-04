// src/lib/whatsapp-api.ts
// ─── كود إرسال الرسائل — مكان واحد بيتاستخدم من Inngest والـ queue ────────────

export interface SendMessageParams {
  toPhone:       string;
  phoneNumberId: string;
  accessToken:   string;
  messageType:   string;
  templateName:  string | null;
  templateLang:  string;
  templateVars:  any;
  content:       string | null;
}

export interface SendResult {
  ok:             boolean;
  whatsappMsgId?: string;
  error?:         string;
  isRateLimit?:   boolean;
  isTokenError?:  boolean;
}

// ─── Constants — بتتقرأ من env أو بتستخدم قيم افتراضية ──────────────────────
export const QUEUE_CONSTANTS = {
  DELAY_BETWEEN_MSGS:  Number(process.env.QUEUE_DELAY_MS        ?? 350),
  BACKOFF_STEPS_SEC:  (process.env.QUEUE_BACKOFF_STEPS ?? "60,300,900,3600").split(",").map(Number),
  TIER_DAILY_LIMIT: {
    1: Number(process.env.TIER_1_DAILY_LIMIT ?? 1_000),
    2: Number(process.env.TIER_2_DAILY_LIMIT ?? 10_000),
    3: Number(process.env.TIER_3_DAILY_LIMIT ?? 100_000),
    4: Infinity,
  } as Record<number, number>,
  TIER_BATCH_SIZE: {
    1: Number(process.env.TIER_1_BATCH_SIZE ?? 10),
    2: Number(process.env.TIER_2_BATCH_SIZE ?? 30),
    3: Number(process.env.TIER_3_BATCH_SIZE ?? 80),
    4: Number(process.env.TIER_4_BATCH_SIZE ?? 150),
  } as Record<number, number>,
};

// ─── Core: إرسال رسالة واحدة عبر Meta Cloud API ─────────────────────────────
export async function sendWhatsAppMessage(item: SendMessageParams): Promise<SendResult> {
  let payload: object;

  if (item.messageType === "template" && item.templateName) {
    const components: object[] = [];
    if (item.templateVars && Array.isArray(item.templateVars.body)) {
      components.push({
        type:       "body",
        parameters: item.templateVars.body.map((v: string) => ({ type: "text", text: v })),
      });
    }
    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              "template",
      template: {
        name:       item.templateName,
        language:   { code: item.templateLang },
        components: components.length ? components : undefined,
      },
    };

  } else if (item.messageType === "media" && item.content) {
    const colonIdx  = item.content.indexOf(":");
    const mediaType = colonIdx > -1 ? item.content.slice(0, colonIdx) : "document";
    const mediaId   = colonIdx > -1 ? item.content.slice(colonIdx + 1) : item.content;
    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              mediaType,
      [mediaType]:       { id: mediaId },
    };

  } else {
    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              "text",
      text:              { body: item.content ?? "" },
    };
  }

  try {
    const res  = await fetch(
      `https://graph.facebook.com/v20.0/${item.phoneNumberId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${item.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    if (res.status === 429 || data?.error?.code === 80007)
      return { ok: false, isRateLimit: true, error: "Rate limit — 429" };

    if (data?.error?.code === 190 || data?.error?.code === 200)
      return { ok: false, isTokenError: true, error: data.error.message };

    if (data?.error)
      return { ok: false, error: data.error.message };

    return { ok: true, whatsappMsgId: data.messages?.[0]?.id };

  } catch (err: any) {
    return { ok: false, error: err.message ?? "Network error" };
  }
}