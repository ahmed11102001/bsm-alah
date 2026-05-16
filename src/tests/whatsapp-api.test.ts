// src/__tests__/whatsapp-api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppMessage, type SendMessageParams } from "@/lib/whatsapp-api";

// ─── Mock fetch globally ───────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Helper: base params ──────────────────────────────────────────────────────
const baseParams: SendMessageParams = {
  toPhone:       "201012345678",
  phoneNumberId: "PHONE_ID_123",
  accessToken:   "TOKEN_ABC",
  messageType:   "text",
  templateName:  null,
  templateLang:  "ar",
  templateVars:  null,
  content:       "أهلاً بيك!",
};

// ─── Helper: mock response ────────────────────────────────────────────────────
function mockResponse(body: object, status = 200) {
  mockFetch.mockResolvedValueOnce({
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  mockFetch.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("sendWhatsAppMessage — text messages", () => {
  it("بيبعت رسالة نص وبيرجع ok:true", async () => {
    mockResponse({ messages: [{ id: "wamid.001" }] });

    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(true);
    expect(result.whatsappMsgId).toBe("wamid.001");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("text");
    expect(body.text.body).toBe("أهلاً بيك!");
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("201012345678");
  });

  it("بيحط الـ Authorization header صح", async () => {
    mockResponse({ messages: [{ id: "wamid.002" }] });
    await sendWhatsAppMessage(baseParams);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer TOKEN_ABC");
  });

  it("بيبعت لـ URL الصح (phoneNumberId)", async () => {
    mockResponse({ messages: [{ id: "wamid.003" }] });
    await sendWhatsAppMessage(baseParams);

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("PHONE_ID_123");
    expect(url).toContain("graph.facebook.com");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("sendWhatsAppMessage — template messages", () => {
  const templateParams: SendMessageParams = {
    ...baseParams,
    messageType:  "template",
    templateName: "order_confirmed",
    templateLang: "ar",
    templateVars: { body: ["أحمد", "ORD-001"] },
    content:      null,
  };

  it("بيبعت template صح مع components", async () => {
    mockResponse({ messages: [{ id: "wamid.004" }] });
    const result = await sendWhatsAppMessage(templateParams);

    expect(result.ok).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("order_confirmed");
    expect(body.template.language.code).toBe("ar");
    expect(body.template.components[0].parameters).toHaveLength(2);
    expect(body.template.components[0].parameters[0].text).toBe("أحمد");
  });

  it("template من غير متغيرات — مفيش components", async () => {
    mockResponse({ messages: [{ id: "wamid.005" }] });
    const result = await sendWhatsAppMessage({
      ...templateParams,
      templateVars: null,
    });

    expect(result.ok).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.template.components).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("sendWhatsAppMessage — media messages", () => {
  it("بيبعت image صح", async () => {
    mockResponse({ messages: [{ id: "wamid.006" }] });
    const result = await sendWhatsAppMessage({
      ...baseParams,
      messageType: "media",
      content:     "image:MEDIA_ID_123",
      templateName: null,
    });

    expect(result.ok).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("image");
    expect(body.image.id).toBe("MEDIA_ID_123");
  });

  it("بيبعت document صح", async () => {
    mockResponse({ messages: [{ id: "wamid.007" }] });
    await sendWhatsAppMessage({
      ...baseParams,
      messageType: "media",
      content:     "document:DOC_ID_456",
      templateName: null,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe("document");
    expect(body.document.id).toBe("DOC_ID_456");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("sendWhatsAppMessage — error handling", () => {
  it("rate limit (429) → isRateLimit:true", async () => {
    mockResponse({}, 429);
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.isRateLimit).toBe(true);
  });

  it("rate limit by error code 80007 → isRateLimit:true", async () => {
    mockResponse({ error: { code: 80007, message: "Rate limit" } }, 200);
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.isRateLimit).toBe(true);
  });

  it("token expired (code 190) → isTokenError:true", async () => {
    mockResponse({ error: { code: 190, message: "Invalid OAuth access token" } });
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.isTokenError).toBe(true);
    expect(result.error).toBe("Invalid OAuth access token");
  });

  it("token invalid (code 200) → isTokenError:true", async () => {
    mockResponse({ error: { code: 200, message: "Permissions error" } });
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.isTokenError).toBe(true);
  });

  it("خطأ عام من API → ok:false مع رسالة الخطأ", async () => {
    mockResponse({ error: { code: 999, message: "Unknown error" } });
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Unknown error");
    expect(result.isRateLimit).toBeUndefined();
    expect(result.isTokenError).toBeUndefined();
  });

  it("network failure → ok:false", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failed"));
    const result = await sendWhatsAppMessage(baseParams);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Network failed");
  });
});