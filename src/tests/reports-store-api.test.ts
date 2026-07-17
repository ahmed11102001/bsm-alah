// src/tests/reports-store-api.test.ts
// ─── اختبار /api/reports/store — الراوت اللي بيغذي تاب "تقارير المتجر" ───────
// بيغطي: الأمان (401/404)، resolve الـ userId من parentId، فلترة الأوردرات
// (all/confirmed/cancelled)، حساب نسبة إيرادات الحملات، وشكل الـ response.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  campaign: { findMany: vi.fn() },
  campaignOrder: { aggregate: vi.fn() },
  storeOrder: {
    groupBy:   vi.fn(),
    findMany:  vi.fn(),
    count:     vi.fn(),
    aggregate: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { GET } from "@/app/api/reports/store/route";
import { NextRequest } from "next/server";

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("https://app.example.com/api/reports/store");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const SESSION = { user: { id: "user-1" } };

// ── قيم افتراضية سليمة لكل نداءات prisma عشان مسار الـ happy path ما يتكسرش ──
function setupHappyDefaults() {
  mockPrisma.user.findUnique.mockResolvedValue({
    shopifyStore: null, easyOrdersStore: null, wooCommerceStore: null,
  });
  mockPrisma.campaign.findMany.mockResolvedValue([]);
  mockPrisma.campaignOrder.aggregate.mockResolvedValue({ _sum: { revenue: null } });
  mockPrisma.storeOrder.aggregate.mockResolvedValue({ _sum: { total: null } });
  mockPrisma.storeOrder.count.mockResolvedValue(0);
  mockPrisma.storeOrder.findMany.mockResolvedValue([]);
  // groupBy بيتنادى 3 مرات بأشكال مختلفة — بنميزهم بمحتوى by[]
  mockPrisma.storeOrder.groupBy.mockImplementation((args: any) => {
    if (args.by.length === 1 && args.by[0] === "status")        return Promise.resolve([]);
    if (args.by.length === 1 && args.by[0] === "customerPhone") return Promise.resolve([]);
    return Promise.resolve([]); // topCustomers (3 حقول)
  });
}

describe("GET /api/reports/store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    setupHappyDefaults();
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("اليوزر مش موجود في الداتابيز → 404", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it("حساب فرعي (parentId) → بيستخدم الـ parentId في كل الاستعلامات", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "sub-1", parentId: "owner-9" } });
    await GET(makeReq());

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "owner-9" } })
    );
    expect(mockPrisma.storeOrder.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "owner-9" }) })
    );
  });

  it("orderFilter=confirmed → بيفلتر الأوردرات على status=confirmed بس", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    await GET(makeReq({ orderFilter: "confirmed" }));

    expect(mockPrisma.storeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "confirmed" }) })
    );
  });

  it("orderFilter=cancelled → بيفلتر على status=cancelled بس", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    await GET(makeReq({ orderFilter: "cancelled" }));

    expect(mockPrisma.storeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "cancelled" }) })
    );
  });

  it("من غير orderFilter (all) → بيجيب confirmed و cancelled مع بعض", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    await GET(makeReq());

    expect(mockPrisma.storeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["confirmed", "cancelled"] } }),
      })
    );
  });

  it("ordersPage=2 → بيعمل skip صحيح (pageSize=50)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    await GET(makeReq({ ordersPage: "2" }));

    expect(mockPrisma.storeOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 })
    );
  });

  it("نسبة إيرادات الحملات بتتحسب صح (campaignRev / totalRev × 100)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.storeOrder.aggregate.mockResolvedValueOnce({ _sum: { total: 1000 } });
    mockPrisma.campaignOrder.aggregate.mockResolvedValueOnce({ _sum: { revenue: 250 } });

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.summary.totalRevenue).toBe(1000);
    expect(data.summary.totalCampaignRevenue).toBe(250);
    expect(data.summary.campaignRevenueShare).toBe(25);
  });

  it("مفيش إيرادات خالص → النسبة صفر (مش NaN أو Infinity)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.storeOrder.aggregate.mockResolvedValueOnce({ _sum: { total: 0 } });
    mockPrisma.campaignOrder.aggregate.mockResolvedValueOnce({ _sum: { revenue: 0 } });

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.summary.campaignRevenueShare).toBe(0);
  });

  it("المتاجر المتصلة بتتجمع صح في stores[] (Shopify + EasyOrders)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      shopifyStore:     { id: "s1", shop: "my-store.myshopify.com", createdAt: new Date("2026-01-01") },
      easyOrdersStore:  { id: "e1", storeName: "متجري", isActive: true, lastSyncAt: new Date("2026-02-01") },
      wooCommerceStore: null,
    });

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.stores).toEqual([
      expect.objectContaining({ source: "shopify", name: "my-store.myshopify.com" }),
      expect.objectContaining({ source: "easyorders", name: "متجري", isActive: true }),
    ]);
    expect(data.summary.storesConnected).toBe(2);
  });

  it("topCustomers بيتحول من شكل groupBy لشكل flat صحيح", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.storeOrder.groupBy.mockImplementation((args: any) => {
      if (args.by.length === 3) {
        return Promise.resolve([
          { customerPhone: "0100", customerName: "أحمد", currency: "EGP", _sum: { total: 500 }, _count: { id: 3 } },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.topCustomers).toEqual([
      { phone: "0100", name: "أحمد", ordersCount: 3, totalSpent: 500, currency: "EGP" },
    ]);
  });

  it("أي استثناء غير متوقع → 500 من غير ما يطيح السيرفر", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("db down"));

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});