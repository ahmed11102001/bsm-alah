// src/tests/campaigns-api.test.ts
// ─── اختبار /api/campaigns — الراوت اللي بيغذي تاب "الحملات" ─────────────────
// بيغطي: جلب الحملات مع إحصائيات القراءة/التسليم، إنشاء حملة (numbers/recipients)،
// حدود الباقة (quota)، فترة الـ backoff، تكرار حملة قديمة، وحذف حملة.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockPrisma = vi.hoisted(() => ({
  campaign: {
    findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(),
  },
  messageQueue: { groupBy: vi.fn(), updateMany: vi.fn() },
  message: { groupBy: vi.fn(), deleteMany: vi.fn() },
  whatsAppAccount: { findUnique: vi.fn() },
  template: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const mockCheckFeature               = vi.hoisted(() => vi.fn());
const mockConsumeCampaignQuotaAtomic = vi.hoisted(() => vi.fn());
const mockRefundCampaignQuota        = vi.hoisted(() => vi.fn());
const mockIncrementCampaignUsage     = vi.hoisted(() => vi.fn());

vi.mock("@/lib/plan-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plan-guard")>();
  return {
    ...actual, // guardResponse الحقيقية — منطق بسيط بيستاهل نستخدمه زي ما هو
    checkFeature: mockCheckFeature,
    consumeCampaignQuotaAtomic: mockConsumeCampaignQuotaAtomic,
    refundCampaignQuota: mockRefundCampaignQuota,
    incrementCampaignUsage: mockIncrementCampaignUsage,
    checkCampaignsLimit: vi.fn().mockResolvedValue({ allowed: true }),
  };
});

const mockEnqueueCampaign = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queue", () => ({ enqueueCampaign: mockEnqueueCampaign }));

const mockInngest = vi.hoisted(() => ({ inngest: { send: vi.fn() } }));
vi.mock("@/inngest/client", () => mockInngest);

vi.mock("@/lib/crypto", () => ({ decryptToken: vi.fn((v: string) => v) }));

import { GET, POST, DELETE } from "@/app/api/campaigns/route";
import { NextRequest } from "next/server";

const SESSION = { user: { id: "user-1" } };

function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("https://app.example.com/api/campaigns");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeReq(method: string, body: any): NextRequest {
  return new NextRequest("https://app.example.com/api/campaigns", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

const WHATSAPP_ACCOUNT = {
  id: "acc-1", accessToken: "enc-token", phoneNumberId: "phone-1", backoffUntil: null,
};

describe("GET /api/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockPrisma.campaign.findMany.mockResolvedValue([]);
    mockPrisma.campaign.count.mockResolvedValue(0);
    mockPrisma.messageQueue.groupBy.mockResolvedValue([]);
    mockPrisma.message.groupBy.mockResolvedValue([]);
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("limit بيتحد بـ 100 أقصى حاجة حتى لو طلب أكتر", async () => {
    await GET(makeGetReq({ limit: "500" }));
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("status=all → مبيفلترش على status خالص", async () => {
    await GET(makeGetReq({ status: "all" }));
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });

  it("search → بيفلتر بالاسم (insensitive)", async () => {
    await GET(makeGetReq({ search: "عروض" }));
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: "عروض", mode: "insensitive" } }),
      })
    );
  });

  it("deliveredCount و readCount بييجوا من Message table مش من عداد الحملة نفسها", async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      { id: "camp-1", name: "حملة 1", status: "completed", sentCount: 100, failedCount: 2,
        scheduledAt: null, createdAt: new Date(), completedAt: new Date(), template: null },
    ]);
    mockPrisma.messageQueue.groupBy.mockImplementation((args: any) => {
      if (args.where.status) return Promise.resolve([{ campaignId: "camp-1", _count: { id: 5 } }]); // pending
      return Promise.resolve([{ campaignId: "camp-1", _count: { id: 120 } }]); // total queued
    });
    mockPrisma.message.groupBy.mockImplementation((args: any) => {
      if (args.where.status === "delivered") return Promise.resolve([{ campaignId: "camp-1", _count: { id: 90 } }]);
      if (args.where.status === "read")      return Promise.resolve([{ campaignId: "camp-1", _count: { id: 60 } }]);
      return Promise.resolve([]);
    });

    const res = await GET(makeGetReq());
    const data = await res.json();

    expect(data.campaigns[0]).toEqual(expect.objectContaining({
      totalQueued: 120, queuedCount: 5, deliveredCount: 90, readCount: 60,
    }));
  });

  it("خطأ غير متوقع → 500", async () => {
    mockPrisma.campaign.findMany.mockRejectedValueOnce(new Error("db down"));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/campaigns — إنشاء حملة (handleCreate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockConsumeCampaignQuotaAtomic.mockResolvedValue({ allowed: true });
    mockCheckFeature.mockResolvedValue({ allowed: true });
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValue(WHATSAPP_ACCOUNT);
    mockPrisma.template.findFirst.mockResolvedValue({ id: "tpl-1", name: "wani_promo", language: "ar" });
    mockPrisma.campaign.create.mockResolvedValue({ id: "camp-new" });
    mockEnqueueCampaign.mockResolvedValue({ queued: 10 });
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(401);
  });

  it("attributionHours خارج المدى (1-168) → 400", async () => {
    const res = await POST(makeReq("POST", {
      name: "x", templateName: "wani_promo", numbers: ["201012345678"], attributionHours: 500,
    }));
    expect(res.status).toBe(400);
  });

  it("اسم الحملة فاضي → 400", async () => {
    const res = await POST(makeReq("POST", { name: "  ", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(400);
  });

  it("مفيش قالب → 400", async () => {
    const res = await POST(makeReq("POST", { name: "x", numbers: ["201012345678"] }));
    expect(res.status).toBe(400);
  });

  it("مفيش أرقام ولا recipients → 400", async () => {
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: [] }));
    expect(res.status).toBe(400);
  });

  it("مفيش حساب واتساب متصل → 400", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(400);
  });

  it("الرقم في فترة backoff بسبب ميتا → 429 مع مدة الانتظار", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      ...WHATSAPP_ACCOUNT, backoffUntil: new Date(Date.now() + 10 * 60_000),
    });
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(429);
  });

  it("القالب المطلوب مش موجود → 404", async () => {
    mockPrisma.template.findFirst.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", { name: "x", templateName: "ghost_tpl", numbers: ["201012345678"] }));
    expect(res.status).toBe(404);
  });

  it("حملة مجدولة والباقة ملهاش scheduledCampaigns → بيترفض بـ 403 قبل ما يعمل أي حاجة", async () => {
    mockCheckFeature.mockResolvedValueOnce({ allowed: false, message: "الميزة دي مش متاحة في باقتك" });
    const res = await POST(makeReq("POST", {
      name: "x", templateName: "wani_promo", numbers: ["201012345678"],
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    }));
    expect(res.status).toBe(403);
    expect(mockPrisma.campaign.create).not.toHaveBeenCalled();
  });

  it("تجاوز حد الحملات (quota) → 403 ومبيعملش الحملة خالص", async () => {
    mockConsumeCampaignQuotaAtomic.mockResolvedValueOnce({
      allowed: false, message: "تجاوزت حد الحملات الشهري", code: "LIMIT", requiredPlan: "pro",
    });
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(403);
    expect(mockPrisma.campaign.create).not.toHaveBeenCalled();
  });

  it("نجاح — بينشئ الحملة، يعمل enqueue، وبينادي Inngest", async () => {
    const res = await POST(makeReq("POST", {
      name: " حملة العروض ", templateName: "wani_promo", numbers: ["201012345678", "201098765432"],
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.campaignId).toBe("camp-new");
    expect(data.queued).toBe(10);

    expect(mockEnqueueCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: "camp-new", numbers: ["201012345678", "201098765432"] })
    );
    expect(mockInngest.inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "campaign/send" })
    );
  });

  it("فشل قبل الـ try/catch الداخلي أصلاً (مثلاً DB error وقت جلب حساب واتساب) → برضه 500 نضيف مش unhandled rejection", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockRejectedValueOnce(new Error("db connection lost"));
    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));
    expect(res.status).toBe(500);
  });

  it("recipients[] (per-recipient vars) → بيبني قائمة الأرقام من recipients مش numbers", async () => {
    await POST(makeReq("POST", {
      name: "x", templateName: "wani_promo",
      recipients: [
        { phone: "201011111111", templateVars: ["أحمد"] },
        { phone: "201022222222", templateVars: ["سارة"] },
      ],
    }));

    expect(mockEnqueueCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ numbers: ["201011111111", "201022222222"] })
    );
  });

  it("فشل الـ enqueue → بيرجّع الكوتة (refund) ويرجع 500 JSON نضيف (بعد إصلاح الـ await)", async () => {
    mockEnqueueCampaign.mockRejectedValueOnce(new Error("queue crashed"));

    const res = await POST(makeReq("POST", { name: "x", templateName: "wani_promo", numbers: ["201012345678"] }));

    expect(res.status).toBe(500);
    expect(mockRefundCampaignQuota).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/campaigns — MCP internal bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockConsumeCampaignQuotaAtomic.mockResolvedValue({ allowed: true });
    mockCheckFeature.mockResolvedValue({ allowed: true });
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValue(WHATSAPP_ACCOUNT);
    mockPrisma.template.findFirst.mockResolvedValue({ id: "tpl-1", name: "wani_promo", language: "ar" });
    mockPrisma.campaign.create.mockResolvedValue({ id: "camp-mcp" });
    mockEnqueueCampaign.mockResolvedValue({ queued: 1 });
  });

  it("mcpOwnerId مش موجود في الداتابيز → 401 من غير next-auth خالص", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", {
      _mcpInternal: true, _mcpOwnerId: "ghost-user",
      name: "x", templateName: "wani_promo", numbers: ["201012345678"],
    }));
    expect(res.status).toBe(401);
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it("mcpOwnerId صحيح → بينفذ handleCreate من غير جلسة next-auth", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "mcp-owner-1" });
    const res = await POST(makeReq("POST", {
      _mcpInternal: true, _mcpOwnerId: "mcp-owner-1",
      name: "x", templateName: "wani_promo", numbers: ["201012345678"],
    }));
    expect(res.status).toBe(200);
    expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "mcp-owner-1" }) })
    );
  });
});

describe("POST /api/campaigns — تكرار حملة (handleRepeat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockConsumeCampaignQuotaAtomic.mockResolvedValue({ allowed: true });
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValue(WHATSAPP_ACCOUNT);
    mockPrisma.campaign.create.mockResolvedValue({ id: "camp-repeat" });
    mockEnqueueCampaign.mockResolvedValue({ queued: 3 });
  });

  const OLD_CAMPAIGN = {
    id: "camp-old", name: "حملة قديمة",
    createdAt: new Date(Date.now() - 72 * 3600_000), // من 3 أيام
    template: { id: "tpl-1", name: "wani_promo", language: "ar" },
    messages: [
      { contact: { phone: "201011111111" } },
      { contact: { phone: "201011111111" } }, // مكرر — لازم يتفلتر
      { contact: { phone: "201022222222" } },
    ],
  };

  it("الحملة الأصلية مش موجودة → 404", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", { _action: "repeat", campaignId: "ghost" }));
    expect(res.status).toBe(404);
  });

  it("قبل ما تعدي 48 ساعة على الحملة الأصلية → 400", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({
      ...OLD_CAMPAIGN, createdAt: new Date(), // اتعملت دلوقتي
    });
    const res = await POST(makeReq("POST", { _action: "repeat", campaignId: "camp-old" }));
    expect(res.status).toBe(400);
  });

  it("مفيش أرقام في الحملة الأصلية خالص → 400", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...OLD_CAMPAIGN, messages: [] });
    const res = await POST(makeReq("POST", { _action: "repeat", campaignId: "camp-old" }));
    expect(res.status).toBe(400);
  });

  it("نجاح — الأرقام المكررة بتتوحد، والاسم بيتحط له (تكرار)", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(OLD_CAMPAIGN);
    const res = await POST(makeReq("POST", { _action: "repeat", campaignId: "camp-old" }));

    expect(res.status).toBe(200);
    expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "حملة قديمة (تكرار)" }) })
    );
    expect(mockEnqueueCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ numbers: ["201011111111", "201022222222"] })
    );
  });
});

describe("DELETE /api/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockPrisma.$transaction.mockImplementation(async (arr: any[]) => Promise.all(arr));
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq("DELETE", { id: "camp-1" }));
    expect(res.status).toBe(401);
  });

  it("id مفقود → 400", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("الحملة مش موجودة أو ملكش → 404", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq("DELETE", { id: "camp-x" }));
    expect(res.status).toBe(404);
  });

  it("نجاح — بيلغي الرسايل المعلقة، يمسح الرسايل المرسلة، ويمسح الحملة", async () => {
    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: "camp-1", userId: "user-1" });
    const res = await DELETE(makeReq("DELETE", { id: "camp-1" }));

    expect(mockPrisma.messageQueue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ campaignId: "camp-1" }) })
    );
    expect(mockPrisma.message.deleteMany).toHaveBeenCalledWith({ where: { campaignId: "camp-1" } });
    expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({ where: { id: "camp-1" } });
    expect(res.status).toBe(200);
  });
});