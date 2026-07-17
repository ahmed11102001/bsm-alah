// src/tests/audiences-api.test.ts
// ─── اختبار /api/audiences — الراوت اللي بيغذي تاب "الجمهور" ─────────────────
// بيغطي: القوائم الذكية (VIP / المتفاعلون / لم يردوا)، إنشاء جمهور بأرقام
// مكررة/غلط، حد الباقة على عدد الأرقام، تحديث وحذف الجمهور.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockCheckContactsLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/plan-guard", () => ({ checkContactsLimit: mockCheckContactsLimit }));

const mockTx = vi.hoisted(() => ({
  audience: { create: vi.fn(), findUniqueOrThrow: vi.fn() },
  contact:  { upsert: vi.fn(), updateMany: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  message:    { groupBy: vi.fn(), findMany: vi.fn() },
  storeOrder: { groupBy: vi.fn() },
  contact:    { findMany: vi.fn(), updateMany: vi.fn() },
  audience:   { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { GET, POST, PATCH, DELETE } from "@/app/api/audiences/route";
import { NextRequest } from "next/server";

const SESSION = { user: { id: "user-1" } };

function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("https://app.example.com/api/audiences");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makeReq(method: string, body: any): NextRequest {
  return new NextRequest("https://app.example.com/api/audiences", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("GET /api/audiences — القوائم الذكية", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeGetReq({ audienceId: "vip" }));
    expect(res.status).toBe(401);
  });

  it("VIP: بيجمع (تفاعل ≥3) و(طلبات ≥2) في ست واحدة من غير تكرار", async () => {
    mockPrisma.message.groupBy.mockResolvedValueOnce([
      { contactId: "c1", _count: { id: 5 } },
      { contactId: "c2", _count: { id: 1 } }, // أقل من 3 → مستبعد
    ]);
    mockPrisma.storeOrder.groupBy.mockResolvedValueOnce([
      { contactId: "c1", _count: { id: 3 } }, // موجود أصلاً من تفاعل الرسائل
      { contactId: "c3", _count: { id: 2 } }, // مضاف من الطلبات
      { contactId: "c4", _count: { id: 1 } }, // أقل من 2 → مستبعد
    ]);
    mockPrisma.contact.findMany.mockResolvedValueOnce([
      { id: "c1", phone: "20100", name: "أحمد" },
      { id: "c3", phone: "20102", name: "سارة" },
    ]);

    const res = await GET(makeGetReq({ audienceId: "vip" }));
    const data = await res.json();

    expect(data.contactCount).toBe(2); // c1 + c3 بس (c2, c4 مستبعدين)
    expect(data.type).toBe("vip");
  });

  it("VIP: لو فشل استعلام الطلبات (مثلاً المتجر مش متصل) → يكمل بمعيار التفاعل بس", async () => {
    mockPrisma.message.groupBy.mockResolvedValueOnce([
      { contactId: "c1", _count: { id: 4 } },
    ]);
    mockPrisma.storeOrder.groupBy.mockRejectedValueOnce(new Error("no store"));
    mockPrisma.contact.findMany.mockResolvedValueOnce([{ id: "c1", phone: "20100", name: null }]);

    const res = await GET(makeGetReq({ audienceId: "vip" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.contactCount).toBe(1);
  });

  it("engaged: أي حد رد ولو مرة، من غير حد أدنى", async () => {
    mockPrisma.message.groupBy.mockResolvedValueOnce([
      { contactId: "c1", _count: { id: 1 } },
      { contactId: "c2", _count: { id: 10 } },
    ]);
    mockPrisma.contact.findMany.mockResolvedValueOnce([]);

    const res = await GET(makeGetReq({ audienceId: "engaged" }));
    const data = await res.json();
    expect(data.contactCount).toBe(2);
  });

  it("no-response: العملاء اللي اتبعتلهم رسايل ومردوش خالص", async () => {
    mockPrisma.message.findMany
      .mockResolvedValueOnce([{ contactId: "c1" }, { contactId: "c2" }, { contactId: "c3" }]) // sent
      .mockResolvedValueOnce([{ contactId: "c2" }]); // replied
    mockPrisma.contact.findMany.mockResolvedValueOnce([]);

    const res = await GET(makeGetReq({ audienceId: "no-response" }));
    const data = await res.json();
    // c1 و c3 بس (c2 رد)
    expect(data.contactCount).toBe(2);
  });

  it("جمهور عادي (مش سمارت ليست) مش موجود → 404", async () => {
    mockPrisma.audience.findFirst.mockResolvedValueOnce(null);
    const res = await GET(makeGetReq({ audienceId: "aud-999" }));
    expect(res.status).toBe(404);
  });

  it("جمهور عادي موجود → بيرجع بياناته وعدد جهات الاتصال الحقيقي", async () => {
    mockPrisma.audience.findFirst.mockResolvedValueOnce({
      id: "aud-1", name: "عملاء القاهرة", type: "excel",
      createdAt: new Date("2026-01-01"),
      contacts: [{ id: "c1", phone: "20100", name: "أحمد" }],
      _count: { contacts: 30 },
    });
    const res = await GET(makeGetReq({ audienceId: "aud-1" }));
    const data = await res.json();
    expect(data.contactCount).toBe(30);
    expect(data.contacts).toHaveLength(1);
  });
});

describe("POST /api/audiences — إنشاء جمهور جديد", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockCheckContactsLimit.mockResolvedValue({ allowed: true });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.audience.create.mockResolvedValue({ id: "aud-new" });
    mockTx.audience.findUniqueOrThrow.mockResolvedValue({
      id: "aud-new", name: "جمهور جديد", type: "excel", createdAt: new Date("2026-01-01"),
      contacts: [], _count: { contacts: 0 },
    });
  });

  it("اسم الجمهور فاضي → 400", async () => {
    const res = await POST(makeReq("POST", { name: "  ", contacts: [{ phone: "01012345678" }] }));
    expect(res.status).toBe(400);
  });

  it("مفيش جهات اتصال خالص → 400", async () => {
    const res = await POST(makeReq("POST", { name: "جمهور", contacts: [] }));
    expect(res.status).toBe(400);
  });

  it("كل الأرقام غلط (مش صالحة) → 400 بدون ما يوصل لحد الباقة أصلاً", async () => {
    const res = await POST(makeReq("POST", { name: "جمهور", contacts: [{ phone: "123" }, { phone: "abc" }] }));
    expect(res.status).toBe(400);
    expect(mockCheckContactsLimit).not.toHaveBeenCalled();
  });

  it("أرقام مكررة بأشكال مختلفة → بتتوحد لرقم واحد بس قبل حد الباقة", async () => {
    await POST(makeReq("POST", {
      name: "جمهور",
      contacts: [{ phone: "01012345678" }, { phone: "0020 1012345678" }, { phone: "+201012345678" }],
    }));
    // التلات صيغ لنفس الرقم المصري لازم توحدت لواحد بس
    expect(mockCheckContactsLimit).toHaveBeenCalledWith("user-1", 1);
  });

  it("تجاوز حد الباقة → 403 مع كود السبب والباقة المطلوبة", async () => {
    mockCheckContactsLimit.mockResolvedValueOnce({
      allowed: false, message: "تجاوزت حد جهات الاتصال", code: "LIMIT_EXCEEDED", requiredPlan: "pro",
    });
    const res = await POST(makeReq("POST", { name: "جمهور", contacts: [{ phone: "01012345678" }] }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.requiredPlan).toBe("pro");
  });

  it("نجاح الإنشاء → بيرجع 200 وبيانات الجمهور", async () => {
    const res = await POST(makeReq("POST", {
      name: "جمهور", contacts: [{ phone: "01012345678", name: "أحمد" }],
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("aud-new");
  });
});

describe("PATCH /api/audiences — تحديث جهات اتصال جمهور", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockCheckContactsLimit.mockResolvedValue({ allowed: true });
    mockPrisma.audience.findFirst.mockResolvedValue({ id: "aud-1" });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
    mockPrisma.audience.findUnique.mockResolvedValue({ id: "aud-1", contacts: [], _count: { contacts: 1 } });
  });

  it("id مفقود → 400", async () => {
    const res = await PATCH(makeReq("PATCH", { contacts: [{ phone: "01012345678" }] }));
    expect(res.status).toBe(400);
  });

  it("الجمهور مش موجود أو ملكش → 404", async () => {
    mockPrisma.audience.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", { id: "aud-x", contacts: [{ phone: "01012345678" }] }));
    expect(res.status).toBe(404);
  });

  it("بيعمل soft-delete لكل الجهات القديمة قبل ما يضيف الجديدة", async () => {
    await PATCH(makeReq("PATCH", { id: "aud-1", contacts: [{ phone: "01012345678" }] }));
    expect(mockTx.contact.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { audienceId: "aud-1", userId: "user-1" },
        data:  expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("تجاوز حد الباقة بعد الفلترة → 403", async () => {
    mockCheckContactsLimit.mockResolvedValueOnce({ allowed: false, message: "تجاوزت الحد", code: "X" });
    const res = await PATCH(makeReq("PATCH", { id: "aud-1", contacts: [{ phone: "01012345678" }] }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/audiences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockPrisma.$transaction.mockImplementation(async (arr: any[]) => Promise.all(arr));
  });

  it("id مفقود → 400", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("الجمهور مش موجود → 404", async () => {
    mockPrisma.audience.findFirst.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq("DELETE", { id: "aud-x" }));
    expect(res.status).toBe(404);
  });

  it("الحذف بيفك ربط جهات الاتصال الأول (مش بيمسحها) وبعدين يمسح الجمهور", async () => {
    mockPrisma.audience.findFirst.mockResolvedValueOnce({ id: "aud-1" });
    mockPrisma.contact.updateMany.mockResolvedValueOnce({ count: 5 });
    mockPrisma.audience.delete.mockResolvedValueOnce({ id: "aud-1" });

    const res = await DELETE(makeReq("DELETE", { id: "aud-1" }));

    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { audienceId: null } })
    );
    expect(mockPrisma.audience.delete).toHaveBeenCalledWith({ where: { id: "aud-1" } });
    expect(res.status).toBe(200);
  });
});