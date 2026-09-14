import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerApiKey: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  developerOtpTemplate: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  developerProject: {
    update: vi.fn().mockResolvedValue({}),
  },
  developerNotification: {
    create: vi.fn().mockResolvedValue({}),
  },
  otpLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIP: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((t: string) => t),
}));
vi.mock("@/lib/otp-redis", () => ({
  storeOtp: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/developers/otp/send/route";
import { NextRequest } from "next/server";
import { createHash } from "crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────
const API_KEY = "wani_live_testkey123";

function makeReq(body?: object, apiKey: string | null = API_KEY): NextRequest {
  const init: any = { method: "POST" };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey !== null) headers["x-api-key"] = apiKey;
  init.headers = headers;
  if (body) init.body = JSON.stringify(body);
  return new NextRequest("http://localhost/api/developers/otp/send", init);
}

function makeKeyRecord(overrides: any = {}) {
  return {
    id: "key-1",
    projectId: "proj-A",
    status: "ACTIVE",
    project: {
      id: "proj-A",
      developerId: "dev-1",
      ownerId: null,
      plan: "OWNER_PLAN",
      planRenewsAt: new Date(Date.now() + 30 * 86400_000),
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 86400_000),
      trialMessagesUsed: 0,
      trialWarningNotifiedAt: null,
      metaConnection: {
        accessToken: "ENC_TOKEN",
        phoneNumberId: "111",
        wabaId: "222",
        displayPhone: "+20",
        isVerified: true,
      },
      ...overrides.project,
    },
    ...overrides.key,
  };
}

function makeTemplate(overrides: any = {}) {
  return {
    id: "tpl-1",
    projectId: "proj-A",
    name: "otp_verification",
    language: "ar",
    body: '{"addSecurityRecommendation":true}',
    status: "APPROVED",
    metaTemplateId: "meta_999",
    ...overrides,
  };
}

describe("Developers OTP Send — /api/developers/otp/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(makeKeyRecord());
    mockPrisma.developerApiKey.update.mockResolvedValue({});
    mockPrisma.developerProject.update.mockResolvedValue({});
    mockPrisma.developerNotification.create.mockResolvedValue({});
    mockPrisma.otpLog.create.mockResolvedValue({});
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.123" }] }),
    });
  });

  // ── Auth ───────────────────────────────────────────────────────────────
  it("TEST 6: بدون API Key → 401", async () => {
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }, null));
    expect(res.status).toBe(401);
  });

  it("TEST 6b: API Key غير صحيح → 401 + INVALID_API_KEY", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_API_KEY");
  });

  it("TEST 10: ربط Meta ناقص → 400 + NO_META_CONNECTION", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(
      makeKeyRecord({ project: { metaConnection: null } })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("NO_META_CONNECTION");
  });

  // ── TEST 1: happy path عبر templateId ──────────────────────────────────
  it("TEST 1: مفتاح صحيح + قالب APPROVED بنفس المشروع → 200 ويُرسل اسم/لغة القالب من DB", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(makeTemplate());
    const res = await POST(
      makeReq({ phone: "01012345678", templateId: "tpl-1", expiryMinutes: 10 })
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.token).toBeTruthy();
    // Meta استلم اسم ولغة القالب من السجل المحلي — مش من الـ client
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.template.name).toBe("otp_verification");
    expect(payload.template.language).toEqual({ code: "ar" });
  });

  // ── Status gates ───────────────────────────────────────────────────────
  it("TEST 2: قالب PENDING → 400 + TEMPLATE_NOT_APPROVED", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ status: "PENDING" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("TEMPLATE_NOT_APPROVED");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("TEST 3: قالب REJECTED → 400", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ status: "REJECTED" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("TEMPLATE_NOT_APPROVED");
  });

  it("TEST 4: قالب LOCAL_DRAFT → 400", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ status: "LOCAL_DRAFT" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("TEMPLATE_NOT_APPROVED");
  });

  it("TEST 9: معتمد لكن بلا metaTemplateId → 400 + TEMPLATE_NO_META_ID", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ metaTemplateId: null })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("TEMPLATE_NO_META_ID");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── TEST 5: cross-project ──────────────────────────────────────────────
  it("TEST 5: قالب مشروع آخر عبر templateId → 403 + TEMPLATE_WRONG_PROJECT", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ id: "tpl-X", projectId: "proj-B" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-X" }));
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.code).toBe("TEMPLATE_WRONG_PROJECT");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("templateId غير موجود → 404 + TEMPLATE_NOT_FOUND", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ phone: "01012345678", templateId: "nope" }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.code).toBe("TEMPLATE_NOT_FOUND");
  });

  // ── Legacy templateName ────────────────────────────────────────────────
  it("legacy: اسم وحيد مطابق → 200", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([makeTemplate()]);
    const res = await POST(makeReq({ phone: "01012345678", templateName: "otp_verification" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("legacy: اسم غير موجود → 404 + TEMPLATE_NOT_FOUND (رسالة محددة)", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([]);
    const res = await POST(makeReq({ phone: "01012345678", templateName: "otp_verification" }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.code).toBe("TEMPLATE_NOT_FOUND");
    expect(data.error).not.toMatch(/لسه ما اتوافقش/);
  });

  it("TEST 8: نفس الاسم بلغتين بلا تحديد → 400 + TEMPLATE_AMBIGUOUS (لا اختيار عشوائي)", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([
      makeTemplate({ id: "tpl-ar", language: "ar" }),
      makeTemplate({ id: "tpl-en", language: "en_US" }),
    ]);
    const res = await POST(makeReq({ phone: "01012345678", templateName: "otp_verification" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("TEMPLATE_AMBIGUOUS");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("TEST 8b: نفس الاسم مع language → يرسل النسخة الصحيحة", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([
      makeTemplate({ id: "tpl-ar", language: "ar" }),
      makeTemplate({ id: "tpl-en", language: "en_US" }),
    ]);
    const res = await POST(
      makeReq({ phone: "01012345678", templateName: "otp_verification", language: "en_US" })
    );
    expect(res.status).toBe(200);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.template.language).toEqual({ code: "en_US" });
  });

  it("بلا templateId ولا templateName → 400", async () => {
    const res = await POST(makeReq({ phone: "01012345678" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("TEMPLATE_REF_REQUIRED");
  });

  // ── API Key → Project binding ──────────────────────────────────────────
  it("يستخدم projectId من الـ API Key — قالب مشروع آخر لا يُرى عبر templateName", async () => {
    // findMany مقيد بالمشروع داخل الدالة — نتحقق من الـ where
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([]);
    await POST(makeReq({ phone: "01012345678", templateName: "otp_verification" }));
    expect(mockPrisma.developerOtpTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: "proj-A", name: "otp_verification" }),
      })
    );
  });

  it("API Key hash يُحسب بـ sha256 من المفتاح الخام", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(null);
    await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const expected = createHash("sha256").update(API_KEY).digest("hex");
    expect(mockPrisma.developerApiKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: expected } })
    );
  });
});
