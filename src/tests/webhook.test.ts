// src/__tests__/webhook.test.ts
// ─── اختبار أخطر جزء في المشروع: Webhook Handler ─────────────────────────────
// الـ webhook بيستقبل كل رسالة واردة وكل status update من Meta.
// لو فيه bug هنا → رسائل بتضيع أو duplicates بتتحفظ أو أمان بينكسر.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// ─── Helper: بنعمل signature صحيحة بنفس طريقة Meta ──────────────────────────
const APP_SECRET = "test_app_secret_123";

function makeMetaSignature(body: string, secret = APP_SECRET): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hex}`;
}

function makeRequest(body: object, signature?: string, method = "POST"): Request {
  const rawBody = JSON.stringify(body);
  const sig = signature ?? makeMetaSignature(rawBody);
  return new Request("https://app.example.com/api/webhook", {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": sig,
    },
    body: rawBody,
  });
}

// ─── Mock البيئة ─────────────────────────────────────────────────────────────
vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "myverifytoken");

// ─── Mock prisma ──────────────────────────────────────────────────────────────
// بنعمل mock للـ prisma عشان مش عايزين database فعلية
const mockPrisma = {
  whatsAppAccount: {
    findFirst: vi.fn(),
  },
  message: {
    findFirst:   vi.fn(),
    findMany:    vi.fn(),
    updateMany:  vi.fn(),
    update:      vi.fn(),
    create:      vi.fn(),
    count:       vi.fn(),
  },
  campaign: {
    update: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
    upsert:    vi.fn(),
    update:    vi.fn(),
  },
  automationRule: {
    findFirst: vi.fn(),
    findMany:  vi.fn(),
  },
  aIAgent: {
    findUnique: vi.fn(),
  },
  messageQueue: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/notifications", () => ({
  notifyNewMessage:       vi.fn(),
  notifyPlanLimitReached: vi.fn(),
  createNotification:     vi.fn(),
}));
vi.mock("@/lib/cloudinary",   () => ({ downloadFromMetaAndUpload: vi.fn() }));
vi.mock("@/lib/elevenlabs",   () => ({ callVoiceAgent: vi.fn(), uploadAudioToCloudinary: vi.fn() }));
vi.mock("@/lib/ai-agent",     () => ({ getAIReply: vi.fn() }));

// ─── استيراد الـ handler بعد الـ mocks ───────────────────────────────────────
const { GET, POST } = await import("@/app/api/webhook/route");

// ─── Webhook Account stub ─────────────────────────────────────────────────────
const stubAccount = {
  id:            "acc_1",
  userId:        "user_1",
  wabaId:        "waba_1",
  phoneNumberId: "phone_1",
  accessToken:   "TOKEN",
};

beforeEach(() => {
  vi.clearAllMocks();
  // الافتراضي: account موجود
  mockPrisma.whatsAppAccount.findFirst.mockResolvedValue(stubAccount);
  // الافتراضي: مفيش message duplicate
  mockPrisma.message.findFirst.mockResolvedValue(null);
  // الافتراضي: $transaction بيشغّل الـ callback
  mockPrisma.$transaction.mockImplementation((fn: any) =>
    typeof fn === "function" ? fn(mockPrisma) : Promise.all(fn)
  );
  mockPrisma.contact.upsert.mockResolvedValue({ id: "contact_1", phone: "201012345678" });
  mockPrisma.message.create.mockResolvedValue({ id: "msg_1" });
  mockPrisma.message.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.automationRule.findFirst.mockResolvedValue(null);
  mockPrisma.automationRule.findMany.mockResolvedValue([]);
  mockPrisma.aIAgent.findUnique.mockResolvedValue(null);
  mockPrisma.contact.findFirst.mockResolvedValue({ id: "contact_1", voiceAgentEnabled: false });
  mockPrisma.message.count.mockResolvedValue(5);
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("GET /webhook — Verification Handshake", () => {
  it("بيعمل verify صح ويرجع الـ challenge", async () => {
    const req = new Request(
      "https://app.example.com/api/webhook?hub.mode=subscribe&hub.verify_token=myverifytoken&hub.challenge=abc123",
      { method: "GET" }
    );
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123");
  });

  it("بيرفض لو الـ token غلط", async () => {
    const req = new Request(
      "https://app.example.com/api/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=abc123",
      { method: "GET" }
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("بيرفض لو مفيش mode=subscribe", async () => {
    const req = new Request(
      "https://app.example.com/api/webhook?hub.mode=unsubscribe&hub.verify_token=myverifytoken&hub.challenge=abc123",
      { method: "GET" }
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /webhook — HMAC Signature Verification", () => {
  it("بيرفض request من غير signature", async () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const req = new Request("https://app.example.com/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("بيرفض signature غلطة (tampered body)", async () => {
    const body = { object: "whatsapp_business_account", entry: [] };
    const sig  = makeMetaSignature(JSON.stringify({ other: "data" })); // signature لـ body تاني
    const req  = makeRequest(body, sig);
    const res  = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("بيرفض signature من secret غلط", async () => {
    const body = { object: "whatsapp_business_account", entry: [] };
    const sig  = makeMetaSignature(JSON.stringify(body), "wrong_secret");
    const req  = makeRequest(body, sig);
    const res  = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("بيقبل signature صحيحة", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry:  [{ id: "waba_1", changes: [{ value: { metadata: { phone_number_id: "phone_1" } } }] }],
    };
    const res = await POST(makeRequest(payload) as any);
    // مش 401 = الـ signature اتقبلت
    expect(res.status).not.toBe(401);
  });

  it("بيرفض signature بدون prefix sha256=", async () => {
    const body = JSON.stringify({ object: "test" });
    const req  = new Request("https://app.example.com/api/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": "invalidsignature",
      },
      body,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /webhook — Status Updates (Delivered / Read)", () => {
  function makeStatusPayload(waStatus: string, msgId = "wamid.AAA") {
    return {
      object: "whatsapp_business_account",
      entry: [{
        id:      "waba_1",
        changes: [{
          value: {
            metadata:  { phone_number_id: "phone_1" },
            statuses:  [{ id: msgId, status: waStatus, timestamp: "1700000000" }],
          },
        }],
      }],
    };
  }

  it("delivered → بيعمل updateMany على الـ message", async () => {
    mockPrisma.message.findFirst.mockResolvedValue({ id: "msg_1", campaignId: "camp_1" });
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.campaign.update.mockResolvedValue({});

    const res = await POST(makeRequest(makeStatusPayload("delivered")) as any);
    expect(res.status).toBe(200);
    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "delivered" }),
      })
    );
  });

  it("delivered مع campaignId → بيزوّد deliveredCount", async () => {
    mockPrisma.message.findFirst.mockResolvedValue({ id: "msg_1", campaignId: "camp_1" });
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.campaign.update.mockResolvedValue({});

    await POST(makeRequest(makeStatusPayload("delivered")) as any);

    expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { deliveredCount: { increment: 1 } },
      })
    );
  });

  it("read → بيزوّد readCount للحملة", async () => {
    mockPrisma.message.findFirst.mockResolvedValue({ id: "msg_1", campaignId: "camp_1" });
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.campaign.update.mockResolvedValue({});

    await POST(makeRequest(makeStatusPayload("read")) as any);

    expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { readCount: { increment: 1 } },
      })
    );
  });

  it("delivered من غير campaignId → مبيعملش campaign update", async () => {
    mockPrisma.message.findFirst.mockResolvedValue({ id: "msg_1", campaignId: null });
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

    await POST(makeRequest(makeStatusPayload("delivered")) as any);

    expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /webhook — Inbound Messages", () => {
  function makeInboundPayload(overrides: object = {}) {
    return {
      object: "whatsapp_business_account",
      entry: [{
        id:      "waba_1",
        changes: [{
          value: {
            metadata: { phone_number_id: "phone_1" },
            messages: [{
              id:   "wamid.BBB",
              from: "201012345678",
              type: "text",
              text: { body: "مرحبا" },
              timestamp: "1700000000",
              ...overrides,
            }],
          },
        }],
      }],
    };
  }

  it("رسالة نص واردة → بتتحفظ في DB", async () => {
    const res = await POST(makeRequest(makeInboundPayload()) as any);
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.contact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone_userId: { phone: "201012345678", userId: "user_1" } },
      })
    );
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content:   "مرحبا",
          direction: "inbound",
          status:    "delivered",
        }),
      })
    );
  });

  it("duplicate message (نفس whatsappId) → بيتجاهله", async () => {
    // الرسالة موجودة بالفعل
    mockPrisma.message.findFirst.mockResolvedValue({ id: "existing_msg" });

    await POST(makeRequest(makeInboundPayload()) as any);

    // مش المفروض يعمل transaction جديدة
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it("رقم مصري غلط → بيرجع invalid_phone_ignored", async () => {
    const payload = makeInboundPayload({ from: "123" }); // رقم غلط
    const res = await POST(makeRequest(payload) as any);
    const data = await res.json();
    expect(data.status).toBe("invalid_phone_ignored");
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });

  it("account مش موجود في DB → بيرجع ignored", async () => {
    mockPrisma.whatsAppAccount.findFirst.mockResolvedValue(null);
    const res  = await POST(makeRequest(makeInboundPayload()) as any);
    const data = await res.json();
    expect(data.status).toBe("ignored");
  });

  it("object مش whatsapp_business_account → 404", async () => {
    const payload = { object: "instagram", entry: [] };
    const res = await POST(makeRequest(payload) as any);
    expect(res.status).toBe(404);
  });

  it("رسالة reaction → بيرجع reaction_processed بدون ما يحفظ message جديدة", async () => {
    const payload = makeInboundPayload({
      type:     "reaction",
      reaction: { message_id: "wamid.ZZZ", emoji: "👍" },
    });
    // هنا الـ findFirst ده للـ original message اللي انعمل عليها reaction
    mockPrisma.message.findFirst.mockResolvedValue({
      id:        "orig_msg",
      reactions: [],
    });
    mockPrisma.message.update.mockResolvedValue({});

    const res  = await POST(makeRequest(payload) as any);
    const data = await res.json();
    expect(data.status).toBe("reaction_processed");
    // المفروض ما يعملش contact upsert أو message create
    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /webhook — mapStatus (Status Mapping)", () => {
  // بنتأكد إن الـ mapping بيشتغل صح لكل الحالات
  const cases: Array<[string, string]> = [
    ["sent",      "sent"],
    ["delivered", "delivered"],
    ["read",      "read"],
    ["failed",    "failed"],
    ["unknown",   "pending"], // fallback
  ];

  for (const [waStatus, expected] of cases) {
    it(`"${waStatus}" → MessageStatus.${expected}`, async () => {
      mockPrisma.message.findFirst.mockResolvedValue({ id: "m1", campaignId: null });
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      const payload = {
        object: "whatsapp_business_account",
        entry: [{
          id:      "waba_1",
          changes: [{
            value: {
              metadata: { phone_number_id: "phone_1" },
              statuses: [{ id: "wamid.X", status: waStatus }],
            },
          }],
        }],
      };

      await POST(makeRequest(payload) as any);

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expected }),
        })
      );
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("POST /webhook — Error Resilience", () => {
  it("لو الـ DB وقع → بيرجع 200 مش 500 (عشان Meta ما تعيدش الإرسال)", async () => {
    // Meta بتعيد الـ webhook لو جابت 5xx — لازم دايماً نرجع 200
    mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));

    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id:      "waba_1",
        changes: [{
          value: {
            metadata: { phone_number_id: "phone_1" },
            messages: [{
              id:   "wamid.CCC",
              from: "201012345678",
              type: "text",
              text: { body: "test" },
            }],
          },
        }],
      }],
    };

    const res = await POST(makeRequest(payload) as any);
    // الكود المفروض يرجع 200 حتى لو في error داخلي
    expect(res.status).toBe(200);
  });
});