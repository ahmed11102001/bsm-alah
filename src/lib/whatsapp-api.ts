// src/lib/whatsapp-api.ts
// ─── كود إرسال الرسائل — مكان واحد بيتاستخدم من Inngest والـ queue ────────────

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveList {
  buttonText: string;
  rows: InteractiveListRow[];
}

export interface SendMessageParams {
  toPhone: string;
  phoneNumberId: string;
  accessToken: string;
  messageType: string;
  templateName: string | null;
  templateLang: string;
  templateVars: any;
  content: string | null;
  interactive?: {
    body: string;
    footer?: string;
    buttons?: InteractiveButton[];
    list?: InteractiveList;
  };
}

export interface SendResult {
  ok: boolean;
  whatsappMsgId?: string;
  error?: string;
  isRateLimit?: boolean;
  isTokenError?: boolean;
}

// ─── Constants — بتتقرأ من env أو بتستخدم قيم افتراضية ──────────────────────
export const QUEUE_CONSTANTS = {
  DELAY_BETWEEN_MSGS: Number(process.env.QUEUE_DELAY_MS ?? 350),
  BACKOFF_STEPS_SEC: (process.env.QUEUE_BACKOFF_STEPS ?? "60,300,900,3600").split(",").map(Number),
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
    const vars = item.templateVars;

    // ── HEADER: text variables (header_1, header_2 … stored as vars.header[]) ─
    if (vars?.header && Array.isArray(vars.header) && vars.header.length > 0) {
      components.push({
        type: "header",
        parameters: vars.header.map((v: string) => ({ type: "text", text: String(v) })),
      });
    }

    // ── HEADER: media (image / video / document) from vars.headerMediaUrl ──────
    if (vars?.headerMediaUrl) {
      // Derive media type from URL extension, fallback to "image"
      const url: string = vars.headerMediaUrl;
      let mediaType: "image" | "video" | "document" = "image";
      if (vars.headerMediaType) {
        mediaType = vars.headerMediaType as typeof mediaType;
      } else if (/\.(mp4|3gp)(\?|$)/i.test(url)) {
        mediaType = "video";
      } else if (/\.pdf(\?|$)/i.test(url)) {
        mediaType = "document";
      }
      components.push({
        type: "header",
        parameters: [{ type: mediaType, [mediaType]: { link: url } }],
      });
    }

    // ── BODY: text variables (body_1, body_2 … stored as vars.body[]) ──────────
    if (vars?.body && Array.isArray(vars.body) && vars.body.length > 0) {
      components.push({
        type: "body",
        parameters: vars.body.map((v: string) => ({ type: "text", text: String(v) })),
      });
    }

    // ── BUTTONS: dynamic URL suffix (vars.buttons = [{index, value}] or string[]) ─
    if (vars?.buttons && Array.isArray(vars.buttons)) {
      vars.buttons.forEach((btn: any) => {
        // Support both {index, value} objects and plain string array (legacy)
        const idx = typeof btn === "object" ? String(btn.index ?? 0) : String(vars.buttons.indexOf(btn));
        const value = typeof btn === "object" ? String(btn.value ?? "") : String(btn ?? "");
        if (value) {
          components.push({
            type: "button",
            sub_type: "url",
            index: idx,
            parameters: [{ type: "text", text: value }],
          });
        }
      });
    }

    payload = {
      messaging_product: "whatsapp",
      to: item.toPhone,
      type: "template",
      template: {
        name: item.templateName,
        language: { code: item.templateLang ?? "ar" },
        components: components.length ? components : undefined,
      },
    };

  } else if (item.messageType === "media" && item.content) {
    const colonIdx = item.content.indexOf(":");
    const mediaType = colonIdx > -1 ? item.content.slice(0, colonIdx) : "document";
    const mediaId = colonIdx > -1 ? item.content.slice(colonIdx + 1) : item.content;
    payload = {
      messaging_product: "whatsapp",
      to: item.toPhone,
      type: mediaType,
      [mediaType]: { id: mediaId },
    };

  } else if (item.messageType === "interactive_buttons" && item.interactive) {
    if (!item.interactive.buttons || item.interactive.buttons.length === 0 || item.interactive.buttons.length > 3) {
      return { ok: false, error: "interactive_buttons يحتاج بين 1 و 3 أزرار" };
    }
    payload = {
      messaging_product: "whatsapp",
      to: item.toPhone,
      type: "interactive",
      interactive: {
        type: "button",
        body:   { text: item.interactive.body },
        footer: item.interactive.footer ? { text: item.interactive.footer } : undefined,
        action: {
          buttons: item.interactive.buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    };

  } else if (item.messageType === "interactive_list" && item.interactive?.list) {
    payload = {
      messaging_product: "whatsapp",
      to: item.toPhone,
      type: "interactive",
      interactive: {
        type: "list",
        body:   { text: item.interactive.body },
        footer: item.interactive.footer ? { text: item.interactive.footer } : undefined,
        action: {
          button:   item.interactive.list.buttonText.slice(0, 20),
          sections: [{ rows: item.interactive.list.rows.slice(0, 10).map(r => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })) }],
        },
      },
    };

  } else {
    payload = {
      messaging_product: "whatsapp",
      to: item.toPhone,
      type: "text",
      text: { body: item.content ?? "" },
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${item.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${item.accessToken}`,
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