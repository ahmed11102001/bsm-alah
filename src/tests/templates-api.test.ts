// src/tests/templates-api.test.ts
// ─── اختبار /api/templates — الراوت اللي بيغذي صفحة "القوالب" ────────────────
// بيغطي: جلب القوالب، إنشاء قالب (نص/صورة/draft)، فشل رفع الميديا لميتا،
// فشل ميتا في إنشاء القالب، الحذف (لوكال + معتمد من ميتا).

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock next-auth ──────────────────────────────────────────────────────────
const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

// ─── Mock prisma ──────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  template: {
    findMany:   vi.fn(),
    findFirst:  vi.fn(),
    create:     vi.fn(),
    deleteMany: vi.fn(),
  },
  whatsAppAccount: {
    findUnique: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

// ─── Mock crypto ──────────────────────────────────────────────────────────────
const mockCrypto = vi.hoisted(() => ({
  decryptToken: vi.fn((val: string) => val),
}));
vi.mock("@/lib/crypto", () => mockCrypto);

import { GET, POST, DELETE } from "@/app/api/templates/route";

function makeReq(body?: object, headers: Record<string, string> = {}): Request {
  return new Request("https://app.example.com/api/templates", {
    method:  body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const SESSION = { user: { id: "user-1" } };

describe("GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
  });

  it("من غير جلسة → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("بيجيب القوالب الخاصة باليوزر بس (مش قوالب يوزرات تانية)", async () => {
    mockGetServerSession.mockResolvedValueOnce(SESSION);
    mockPrisma.template.findMany.mockResolvedValueOnce([{ id: "t1", userId: "user-1" }]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
    expect(data).toEqual([{ id: "t1", userId: "user-1" }]);
  });

  it("بيستخدم parentId (حساب فرعي) لو موجود بدل الـ id", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "sub-1", parentId: "owner-1" } });
    mockPrisma.template.findMany.mockResolvedValueOnce([]);

    await GET(makeReq());

    expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "owner-1" } })
    );
  });
});

describe("POST /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    mockPrisma.template.create.mockResolvedValue({ id: "tpl-default" });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("من غير جلسة و MCP header → 401", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ name: "x", body: "hi", category: "MARKETING" }));
    expect(res.status).toBe(401);
  });

  it("ناقص حقل مطلوب (name/body/category) → 400", async () => {
    const res = await POST(makeReq({ name: "x" }));
    expect(res.status).toBe(400);
  });

  it("مفيش حساب واتساب متصل ومش draft → بيرفض بـ 400", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ name: "t", body: "hi {{1}}", category: "MARKETING", language: "ar" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("واتساب");
  });

  it("draft=true → بيتحفظ محلي من غير ما ينادي ميتا خالص", async () => {
    const res = await POST(makeReq({
      name: "t", body: "hi {{1}}", category: "MARKETING", language: "ar", draft: true,
    }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("headerType=image: فشل رفع الملف التجريبي لميتا → بيرجع 400 من غير ما يحفظ في الداتابيز", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      accessToken: "enc-token", wabaId: "waba-1",
    });
    // نداء get App ID بيفشل
    (global.fetch as any).mockResolvedValueOnce({ ok: false });

    const res = await POST(makeReq({
      name: "cart", body: "hi {{1}}", category: "MARKETING", language: "ar", headerType: "image",
    }));

    expect(res.status).toBe(400);
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
  });

  it("ميتا بترفض القالب (مثلاً اسم مكرر) → بيرجع خطأ ميتا للمستخدم من غير حفظ", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      accessToken: "enc-token", wabaId: "waba-1",
    });
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "اسم القالب مستخدم" } }),
    });

    const res = await POST(makeReq({
      name: "cart", body: "hi {{1}}", category: "MARKETING", language: "ar", headerType: "none",
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("اسم القالب مستخدم");
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
  });

  it("نجاح الإرسال لميتا مع Header صورة → بيحفظ metaId + components صح", async () => {
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      accessToken: "enc-token", wabaId: "waba-1",
    });
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "app-1" }) })          // App ID
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "sess-1" }) })          // init upload
      .mockResolvedValueOnce({ ok: true, json: async () => ({ h: "HANDLE_XYZ" }) })       // upload file
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "meta_tpl_1" }) });     // create template

    mockPrisma.template.create.mockResolvedValueOnce({ id: "db-1", metaId: "meta_tpl_1" });

    const res = await POST(makeReq({
      name: "wani_cart_abandon", body: "hi {{1}}", category: "MARKETING", language: "ar",
      headerType: "image", exampleVars: ["سارة"],
    }));

    expect(res.status).toBe(200);
    expect(mockPrisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metaId: "meta_tpl_1",
          components: expect.arrayContaining([
            expect.objectContaining({ type: "HEADER", format: "IMAGE" }),
            expect.objectContaining({ type: "BODY" }),
          ]),
        }),
      })
    );
  });

  it("MCP internal call (بدون جلسة next-auth) بيتعرف من الهيدرز", async () => {
    const res = await POST(makeReq(
      { name: "t", body: "hi", category: "MARKETING", draft: true },
      { "x-mcp-internal": "true", "x-mcp-user-id": "mcp-owner-1" },
    ));

    expect(res.status).toBe(200);
    expect(mockPrisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "mcp-owner-1" }) })
    );
  });
});

describe("DELETE /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockReset();
    mockGetServerSession.mockResolvedValue(SESSION);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("القالب مش موجود أو ملكش → 404", async () => {
    mockPrisma.template.findFirst.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq({ id: "not-exist" }));
    expect(res.status).toBe(404);
  });

  it("قالب local (متسحبش من ميتا) → بيتمسح محلي من غير نداء ميتا", async () => {
    mockPrisma.template.findFirst.mockResolvedValueOnce({
      id: "t1", metaId: "local_123", name: "t1",
    });
    const res = await DELETE(makeReq({ id: "t1" }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPrisma.template.deleteMany).toHaveBeenCalledWith({ where: { id: "t1", userId: "user-1" } });
    expect(res.status).toBe(200);
  });

  it("قالب متبعت لميتا فعلاً → بيتمسح من ميتا وبعدين من الداتابيز", async () => {
    mockPrisma.template.findFirst.mockResolvedValueOnce({
      id: "t2", metaId: "meta_tpl_9", name: "wani_cart_abandon",
    });
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      accessToken: "enc-token", wabaId: "waba-1",
    });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    const res = await DELETE(makeReq({ id: "t2" }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("message_templates?name=wani_cart_abandon"),
      expect.objectContaining({ method: "DELETE" })
    );
    expect(mockPrisma.template.deleteMany).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("فشل حذف ميتا (Network error) → لسه بيكمل يمسح من الداتابيز (مبيوقفش)", async () => {
    mockPrisma.template.findFirst.mockResolvedValueOnce({
      id: "t3", metaId: "meta_tpl_9", name: "wani_cart_abandon",
    });
    mockPrisma.whatsAppAccount.findUnique.mockResolvedValueOnce({
      accessToken: "enc-token", wabaId: "waba-1",
    });
    (global.fetch as any).mockRejectedValueOnce(new Error("network down"));

    const res = await DELETE(makeReq({ id: "t3" }));

    expect(mockPrisma.template.deleteMany).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});