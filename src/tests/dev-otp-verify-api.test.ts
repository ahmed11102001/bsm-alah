import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerApiKey: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  otpLog: {
    updateMany: vi.fn().mockResolvedValue({}),
  },
}));

const mockVerifyOtp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIP: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("@/lib/otp-redis", () => ({
  verifyOtp: mockVerifyOtp,
}));

import { POST } from "@/app/api/developers/otp/verify/route";
import { NextRequest } from "next/server";

function makeReq(body?: object, apiKey: string | null = "wani_live_k"): NextRequest {
  const init: any = { method: "POST" };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey !== null) headers["x-api-key"] = apiKey;
  init.headers = headers;
  if (body) init.body = JSON.stringify(body);
  return new NextRequest("http://localhost/api/developers/otp/verify", init);
}

describe("Developers OTP Verify — /api/developers/otp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.developerApiKey.findUnique.mockResolvedValue({
      id: "key-1",
      projectId: "proj-A",
      status: "ACTIVE",
      project: { developerId: "dev-1" },
    });
    mockVerifyOtp.mockResolvedValue({ success: true, phone: "201012345678" });
  });

  it("نجاح التحقق → 200 + verified + تحديث سجل DB", async () => {
    const res = await POST(makeReq({ token: "tok", code: "123456" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ ok: true, verified: true });
    expect(mockPrisma.otpLog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "tok", projectId: "proj-A" } })
    );
  });

  it("token غير موجود → 404 + TOKEN_NOT_FOUND (بلا تخمين نصي)", async () => {
    mockVerifyOtp.mockResolvedValue({ success: false, code: "TOKEN_NOT_FOUND", error: "Token غير موجود أو منتهي الصلاحية" });
    const res = await POST(makeReq({ token: "tok", code: "123456" }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.code).toBe("TOKEN_NOT_FOUND");
  });

  it("إعادة تشغيل كود متحقق → 400 + ALREADY_VERIFIED", async () => {
    mockVerifyOtp.mockResolvedValue({
      success: false,
      code: "ALREADY_VERIFIED",
      error: "OTP تم التحقق منه مسبقاً ولا يمكن استخدامه مرة أخرى",
      alreadyVerified: true,
    });
    const res = await POST(makeReq({ token: "tok", code: "123456" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("ALREADY_VERIFIED");
    expect(data.verified).toBe(false);
  });

  it("كود خاطئ → 400 + CODE_MISMATCH", async () => {
    mockVerifyOtp.mockResolvedValue({ success: false, code: "CODE_MISMATCH", error: "الكود غير صحيح" });
    const res = await POST(makeReq({ token: "tok", code: "000000" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CODE_MISMATCH");
  });

  it("مفتاح مشروع آخر لا يرى التوكن (عزل عبر projectId)", async () => {
    mockVerifyOtp.mockResolvedValue({ success: false, code: "TOKEN_WRONG_PROJECT", error: "Token لا ينتمي لهذا الـ API Key" });
    const res = await POST(makeReq({ token: "tok", code: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("TOKEN_WRONG_PROJECT");
  });
});
