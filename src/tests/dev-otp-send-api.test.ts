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
import { rateLimit } from "@/lib/rate-limit";
import { storeOtp } from "@/lib/otp-redis";

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
    category: "AUTHENTICATION",
    metaTemplateId: "meta_999",
    metaComponents: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 10 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy Code" }] },
    ],
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
    expect(mockFetch.mock.calls[0][0]).toContain("/messages");
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(mockFetch.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer ENC_TOKEN",
      "Content-Type": "application/json",
    });
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.recipient_type).toBe("individual");
    expect(payload.type).toBe("template");
    expect(payload.template.name).toBe("otp_verification");
    expect(payload.template.language).toEqual({ code: "ar" });
    expect(payload.template.components).toEqual([
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: expect.any(String) }] },
    ]);
  });

  it("approved authentication template without metadata is rejected before Meta", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ metaComponents: null })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.code).toBe("OTP_TEMPLATE_METADATA_INVALID");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("approved authentication template with malformed metadata is rejected before Meta", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ metaComponents: [{ type: "BUTTONS", buttons: [{ type: "OTP" }] }] })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.code).toBe("OTP_TEMPLATE_METADATA_INVALID");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("APPROVED UTILITY template is rejected — OTP requires AUTHENTICATION", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ category: "UTILITY" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("OTP_TEMPLATE_NOT_COMPATIBLE");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("APPROVED MARKETING template is rejected — OTP requires AUTHENTICATION", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({ category: "MARKETING" })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("OTP_TEMPLATE_NOT_COMPATIBLE");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("AUTHENTICATION template with body {{1}} + OTP button emits both components", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({
        metaComponents: [
          { type: "BODY", text: "{{1}} is your verification code." },
          { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
        ],
      })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    expect(res.status).toBe(200);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: expect.any(String) }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: expect.any(String) }] },
    ]);
  });

  it("Meta 131008 is mapped to 422 with META_131008 code and no credential logging", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(makeTemplate());
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 131008, message: "Invalid parameter" } }),
    });
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(422);
    expect(data.metaCode).toBe("131008");
    expect(data.code).toBe("META_131008");
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain("ENC_TOKEN");
    logSpy.mockRestore();
  });

  // ── PHASE 17 regression: realistic wani_otp AUTHENTICATION fixture ──────
  // body "{{1}} is your verification code..." + Copy Code button (كما في Meta).
  // metadata صحيحة → validate → build → Meta 200 → لا 131008.
  it("REGRESSION 131008: realistic wani_otp metadata builds a valid payload and sends", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({
        id: "tpl-wani-otp",
        name: "wani_otp",
        language: "en_US",
        body: JSON.stringify({ addSecurityRecommendation: true, codeExpirationMinutes: 10, otpType: "COPY_CODE" }),
        status: "APPROVED",
        category: "AUTHENTICATION",
        metaTemplateId: "meta_wani_otp_en",
        metaComponents: [
          {
            type: "BODY",
            text: "{{1}} is your verification code. For your security, do not share this code.",
            example: { body_text: [["123456"]] },
          },
          { type: "FOOTER", code_expiration_minutes: 10 },
          { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }] },
        ],
      })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-wani-otp" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.template.name).toBe("wani_otp");
    expect(payload.template.language).toEqual({ code: "en_US" });
    // العقد الكامل: body param + button param — ولا components فارغة
    expect(payload.template.components.length).toBeGreaterThan(0);
    expect(payload.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: expect.any(String) }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: expect.any(String) }] },
    ]);
  });

  it("REGRESSION 131008 (real case): Meta URL copy-code button gets its parameter", async () => {
    // تعريف wani_otp الحقيقي من DB: زر URL (لا OTP) رابطه يحمل {{1}}.
    // سابقًا كان الباني يتجاهله → باراميتر ناقص → 131008 من Meta.
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({
        id: "tpl-wani-otp",
        name: "wani_otp",
        language: "en_US",
        metaTemplateId: "1630235528795888",
        metaComponents: [
          {
            text: "*{{1}}* is your verification code. For your security, do not share this code.",
            type: "BODY",
            example: { body_text: [["123456"]] },
            add_security_recommendation: true,
          },
          {
            type: "BUTTONS",
            buttons: [{
              url: "https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}",
              text: "Copy code",
              type: "URL",
              example: ["https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp123456"],
            }],
          },
        ],
      })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-wani-otp" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.template.name).toBe("wani_otp");
    expect(payload.template.language).toEqual({ code: "en_US" });
    expect(payload.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: expect.any(String) }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: expect.any(String) }] },
    ]);
  });

  it("REGRESSION 131008: نفس القالب بلا metadata → 409 قبل Meta (لا payload ناقص)", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(
      makeTemplate({
        id: "tpl-wani-otp",
        name: "wani_otp",
        language: "en_US",
        status: "APPROVED",
        category: "AUTHENTICATION",
        metaTemplateId: "meta_wani_otp_en",
        metaComponents: null,
      })
    );
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-wani-otp" }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.code).toBe("OTP_TEMPLATE_METADATA_INVALID");
    expect(mockFetch).not.toHaveBeenCalled();
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

  // ── F3: expiryMinutes validation (قبل أي أثر جانبي) ─────────────────────
  it.each(["abc", 0, -5, 61, 1.5, null])("expiryMinutes غير صالح (%s) → 400 EXPIRY_INVALID", async (bad) => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(makeTemplate());
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1", expiryMinutes: bad as any }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("EXPIRY_INVALID");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── F4: الطلب المرفوض لا يستهلك حصة الرقم ───────────────────────────────
  it("قالب مرفوض (404) لا يستهلك rate limit الهاتف", async () => {
    mockPrisma.developerOtpTemplate.findMany.mockResolvedValue([]);
    const res = await POST(makeReq({ phone: "01012345678", templateName: "nope" }));
    expect(res.status).toBe(404);
    expect(vi.mocked(rateLimit)).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── F2: فشل الحفظ بعد نجاح Meta ─────────────────────────────────────────
  it("Meta نجح والحفظ فشل → 502 OTP_STORE_FAILED ولا trial increment", async () => {
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue(makeTemplate());
    vi.mocked(storeOtp).mockRejectedValueOnce(new Error("redis down"));
    const res = await POST(makeReq({ phone: "01012345678", templateId: "tpl-1" }));
    const data = await res.json();
    expect(res.status).toBe(502);
    expect(data.code).toBe("OTP_STORE_FAILED");
    expect(data).not.toHaveProperty("token");
    // Meta اتبعت فعلًا لكن الـ trial لم يُحتسب (الكود غير قابل للتحقق)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockPrisma.developerProject.update).not.toHaveBeenCalled();
  });
});
