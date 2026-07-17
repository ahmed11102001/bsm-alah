// src/tests/store-automation-api.test.ts
// ─── اختبار /api/store/automation — الراوت اللي بيغذي تاب "المتجر" ───────────
// بيغطي: الأمان، ربط المتجر، منطق القوالب المخصصة (dedicated) مقابل promo،
// اختيار القالب المعتمد لما يكون فيه أكتر من نسخة بنفس الاسم.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  storeAutomation: { findMany: vi.fn(), upsert: vi.fn() },
  template: { findMany: vi.fn(), findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { GET, POST } from "@/app/api/store/automation/route";
import { NextRequest } from "next/server";

const SESSION = { user: { id: "user-1", email: "a@b.com" } };

const USER_WITH_SHOPIFY = {
  id: "user-1",
  shopifyStore: { id: "shop-1" },
  easyOrdersStore: null,
  wooCommerceStore: null,
};

function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("https://app.example.com/api/store/automation");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePostReq(body: any): NextRequest {
  return new NextRequest("https://app.example.com/api/store/automation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/store/automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockPrisma.storeAutomation.findMany.mockResolvedValue([]);
    mockPrisma.template.findMany.mockResolvedValue([]);
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeGetReq({ source: "shopify" }));
    expect(res.status).toBe(401);
  });

  it("اليوزر مش موجود → 404", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeGetReq({ source: "shopify" }));
    expect(res.status).toBe(404);
  });

  it("source ناقص أو غلط → 400", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(USER_WITH_SHOPIFY);
    const res = await GET(makeGetReq({ source: "aliexpress" }));
    expect(res.status).toBe(400);
  });

  it("المتجر المطلوب مش مربوط لليوزر ده → 404", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(USER_WITH_SHOPIFY);
    const res = await GET(makeGetReq({ source: "easyorders" })); // مش مربوط
    expect(res.status).toBe(404);
  });

  it("بيربط القالب المخصص المعتمد تلقائياً بنوع الأتمتة (case-insensitive)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(USER_WITH_SHOPIFY);
    mockPrisma.template.findMany.mockImplementation((args: any) => {
      // نداء dedicatedTemplates (فيه AND/OR) أو promoTemplates (فيه status APPROVED مباشرة)
      if (args.where.AND) {
        return Promise.resolve([
          { id: "tpl-cart", name: "WANI_CART_ABANDON", status: "approved" },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await GET(makeGetReq({ source: "shopify" }));
    const data = await res.json();

    const cartAuto = data.automations.find((a: any) => a.type === "cart_abandon");
    expect(cartAuto.isDedicated).toBe(true);
    expect(cartAuto.dedicatedTemplate).toEqual(
      expect.objectContaining({ id: "tpl-cart", status: "approved" })
    );
  });

  it("لما فيه نسختين بنفس اسم القالب المخصص → بيفضّل المعتمدة (APPROVED)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(USER_WITH_SHOPIFY);
    mockPrisma.template.findMany.mockImplementation((args: any) => {
      if (args.where.AND) {
        return Promise.resolve([
          { id: "tpl-old", name: "wani_cart_abandon", status: "REJECTED" },
          { id: "tpl-new", name: "wani_cart_abandon", status: "APPROVED" },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await GET(makeGetReq({ source: "shopify" }));
    const data = await res.json();
    const cartAuto = data.automations.find((a: any) => a.type === "cart_abandon");

    expect(cartAuto.dedicatedTemplate.id).toBe("tpl-new");
  });

  it("promo مش من الأتمتات المخصصة (isDedicated=false)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(USER_WITH_SHOPIFY);

    const res = await GET(makeGetReq({ source: "shopify" }));
    const data = await res.json();
    const promoAuto = data.automations.find((a: any) => a.type === "promo");

    expect(promoAuto.isDedicated).toBe(false);
    expect(promoAuto.dedicatedTemplate).toBeNull();
  });
});

describe("POST /api/store/automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockPrisma.user.findUnique.mockResolvedValue(USER_WITH_SHOPIFY);
    mockPrisma.storeAutomation.upsert.mockResolvedValue({ id: "auto-1" });
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(makePostReq({ source: "shopify", type: "promo" }));
    expect(res.status).toBe(401);
  });

  it("JSON مش صحيح → 400", async () => {
    const badReq = new NextRequest("https://app.example.com/api/store/automation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("delayMinutes خارج المدى (سالب أو أكبر من 1440) → 400", async () => {
    const res = await POST(makePostReq({ source: "shopify", type: "promo", delayMinutes: 2000 }));
    expect(res.status).toBe(400);
  });

  it("type غير موجود في القيم المسموحة → 400", async () => {
    const res = await POST(makePostReq({ source: "shopify", type: "discount_blast" }));
    expect(res.status).toBe(400);
  });

  it("source غير مربوط لليوزر → 404", async () => {
    const res = await POST(makePostReq({ source: "woocommerce", type: "promo" }));
    expect(res.status).toBe(404);
  });

  describe("أتمتة مخصصة (dedicated) — زي cart_abandon", () => {
    it("مفيش قالب بالاسم المتوقع خالص → 422 مع missingTemplate", async () => {
      mockPrisma.template.findMany.mockResolvedValueOnce([]);
      const res = await POST(makePostReq({ source: "shopify", type: "cart_abandon", isEnabled: true }));

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.missingTemplate).toBe("wani_cart_abandon");
    });

    it("القالب موجود لكن لسه PENDING وعايز يفعّل (isEnabled=true) → 422", async () => {
      mockPrisma.template.findMany.mockResolvedValueOnce([
        { id: "tpl-1", name: "wani_cart_abandon", status: "PENDING" },
      ]);
      const res = await POST(makePostReq({ source: "shopify", type: "cart_abandon", isEnabled: true }));

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.templateStatus).toBe("PENDING");
    });

    it("القالب لسه PENDING بس مش هيفعّل الأتمتة (isEnabled=false) → مسموح ومحفوظ", async () => {
      mockPrisma.template.findMany.mockResolvedValueOnce([
        { id: "tpl-1", name: "wani_cart_abandon", status: "PENDING" },
      ]);
      const res = await POST(makePostReq({ source: "shopify", type: "cart_abandon", isEnabled: false }));

      expect(res.status).toBe(200);
      expect(mockPrisma.storeAutomation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ templateId: "tpl-1", isEnabled: false }),
        })
      );
    });

    it("القالب معتمد ومفعّل → بيحفظ templateId الصحيح تلقائياً (مش اللي بعته)", async () => {
      mockPrisma.template.findMany.mockResolvedValueOnce([
        { id: "tpl-real", name: "wani_cart_abandon", status: "APPROVED" },
      ]);
      // حتى لو بعت templateId مختلف، لازم ياخد المخصص
      const res = await POST(makePostReq({
        source: "shopify", type: "cart_abandon", isEnabled: true, templateId: "some-other-id",
      }));

      expect(res.status).toBe(200);
      expect(mockPrisma.storeAutomation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ templateId: "tpl-real" }),
        })
      );
    });
  });

  describe("أتمتة promo (اختيار حر للقالب)", () => {
    it("عايز يفعّل من غير ما يختار قالب → 422", async () => {
      const res = await POST(makePostReq({ source: "shopify", type: "promo", isEnabled: true }));
      expect(res.status).toBe(422);
    });

    it("اختار قالب مش معتمد → 422", async () => {
      mockPrisma.template.findFirst.mockResolvedValueOnce({ status: "PENDING" });
      const res = await POST(makePostReq({
        source: "shopify", type: "promo", isEnabled: true, templateId: "tpl-x",
      }));
      expect(res.status).toBe(422);
    });

    it("اختار قالب معتمد → بينجح ويتحفظ", async () => {
      mockPrisma.template.findFirst.mockResolvedValueOnce({ status: "approved" });
      const res = await POST(makePostReq({
        source: "shopify", type: "promo", isEnabled: true, templateId: "tpl-x",
      }));

      expect(res.status).toBe(200);
      expect(mockPrisma.storeAutomation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shopifyStoreId_type: { shopifyStoreId: "shop-1", type: "promo" } },
          create: expect.objectContaining({ templateId: "tpl-x", shopifyStoreId: "shop-1" }),
        })
      );
    });

    it("مش مفعّل ومفيش قالب مختار → مسموح (تعطيل الأتمتة من غير قالب)", async () => {
      const res = await POST(makePostReq({ source: "shopify", type: "promo", isEnabled: false }));
      expect(res.status).toBe(200);
    });
  });
});