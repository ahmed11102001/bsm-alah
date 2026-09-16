import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

const mockPrisma = vi.hoisted(() => ({
  developerApiKey: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  getIP: () => "1.2.3.4",
}));

import { POST as otpSendPOST } from "@/app/api/developers/otp/send/route";
import { POST as otpVerifyPOST } from "@/app/api/developers/otp/verify/route";
import { GET as otpStatusGET } from "@/app/api/developers/otp/status/[token]/route";
import { POST as deviceTokenPOST } from "@/app/api/developers/cli/device/token/route";
import { NextRequest } from "next/server";

const AR = /[\u0600-\u06FF]/;

function req(path: string, method: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method, headers });
}

describe("OTP API response language", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(null);
  });

  it("defaults to Arabic (portal behavior unchanged)", async () => {
    const send = await otpSendPOST(req("/api/developers/otp/send", "POST", { "Content-Type": "application/json" }));
    expect(send.status).toBe(401);
    const sendBody = await send.json();
    expect(sendBody.code).toBe("INVALID_API_KEY");
    expect(sendBody.error).toMatch(AR);
  });

  it("Accept-Language: en returns English with identical code+status (send)", async () => {
    const res = await otpSendPOST(
      req("/api/developers/otp/send", "POST", { "Content-Type": "application/json", "Accept-Language": "en" })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("INVALID_API_KEY");
    expect(data.error).not.toMatch(AR);
    expect(data.error).toMatch(/API key/i);
  });

  it("Accept-Language: en returns English (verify + status)", async () => {
    const verify = await otpVerifyPOST(
      req("/api/developers/otp/verify", "POST", { "Content-Type": "application/json", "Accept-Language": "en-US, en;q=0.9" })
    );
    expect(verify.status).toBe(401);
    const vBody = await verify.json();
    expect(vBody.code).toBe("INVALID_API_KEY");
    expect(vBody.error).not.toMatch(AR);

    const status = await otpStatusGET(
      req("/api/developers/otp/status/abc", "GET", { "Accept-Language": "en" }),
      { params: Promise.resolve({ token: "abc" }) }
    );
    expect(status.status).toBe(401);
    const sBody = await status.json();
    expect(sBody.code).toBe("INVALID_API_KEY");
    expect(sBody.error).not.toMatch(AR);
  });

  it("non-English Accept-Language stays Arabic", async () => {
    const res = await otpVerifyPOST(
      req("/api/developers/otp/verify", "POST", { "Content-Type": "application/json", "Accept-Language": "ar-EG,ar;q=0.9" })
    );
    const data = await res.json();
    expect(data.code).toBe("INVALID_API_KEY");
    expect(data.error).toMatch(AR);
  });

  it("device/token errors follow the same rule", async () => {
    const en = await deviceTokenPOST(
      req("/api/developers/cli/device/token", "POST", {
        "Content-Type": "application/json",
        "Accept-Language": "en",
      })
    );
    // Missing device_code → 400 INVALID_REQUEST in English.
    expect(en.status).toBe(400);
    const enBody = await en.json();
    expect(enBody.code).toBe("INVALID_REQUEST");
    expect(enBody.error).not.toMatch(AR);

    const ar = await deviceTokenPOST(
      req("/api/developers/cli/device/token", "POST", { "Content-Type": "application/json" })
    );
    const arBody = await ar.json();
    expect(arBody.code).toBe("INVALID_REQUEST");
    expect(arBody.error).toMatch(AR);
  });
});
