import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

// ── Shared mocks ─────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerUser: { findUnique: vi.fn() },
  developerProject: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn().mockResolvedValue({
      id: "proj-1",
      ownerId: null,
      trialCreditsTotal: 30,
      trialCreditsUsed: 0,
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 86400000),
      monthlyFreeTotal: 30,
      monthlyFreeUsed: 0,
      monthlyPeriodStart: null,
      monthlyPeriodEnd: null,
      paidBalanceEGP: 0,
      createdAt: new Date(),
      trialWarningNotifiedAt: null,
      lowBalanceNotifiedAt: null,
      debtNotifiedAt: null,
    }),
    update: vi.fn((args: any) => Promise.resolve({ paidBalanceEGP: 0 })),
  },
  projectLedgerEntry: { create: vi.fn(() => Promise.resolve({})) },
  developerNotification: { create: vi.fn(() => Promise.resolve({})) },
  developerApiKey: { findUnique: vi.fn(), update: vi.fn(() => Promise.resolve({})) },
  developerOtpTemplate: { findUnique: vi.fn() },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockIsOwnerOnly = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({ getDevSessionFromRequest: mockGetDevSession }));
vi.mock("@/lib/dev-role", () => ({ isOwnerOnlyAccount: mockIsOwnerOnly }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  getIP: () => "1.2.3.4",
}));
vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare, hash: vi.fn() },
  compare: mockBcryptCompare,
  hash: vi.fn(),
}));

import { devError, devRateLimited, rateLimiterUnavailableResponse } from "@/lib/dev-errors";
import { POST as loginPOST } from "@/app/api/developers/auth/login/route";
import { GET as meGET } from "@/app/api/developers/auth/me/route";
import { GET as projectsGET, POST as projectsPOST } from "@/app/api/developers/projects/route";
import { POST as otpSendPOST } from "@/app/api/developers/otp/send/route";
import { POST as otpVerifyPOST } from "@/app/api/developers/otp/verify/route";
import { NextRequest } from "next/server";

function makeReq(path: string, method: string, body?: object, headers?: Record<string, string>): NextRequest {
  const hdrs: Record<string, string> = { ...(headers ?? {}) };
  if (body) hdrs["Content-Type"] = "application/json";
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: hdrs,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function expectEnvelope(data: any, code: string) {
  expect(data.ok).toBe(false);
  expect(typeof data.error).toBe("string");
  expect(data.code).toBe(code);
}

describe("dev-errors helper", () => {
  it("devError → {ok:false, error, code} + status", async () => {
    const res = devError("boom", "INTERNAL", 500);
    expect(res.status).toBe(500);
    expectEnvelope(await res.json(), "INTERNAL");
  });

  it("devRateLimited → 429 envelope + Retry-After header", async () => {
    const res = devRateLimited("slow", "RATE_LIMITED", 42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    const data = await res.json();
    expectEnvelope(data, "RATE_LIMITED");
    expect(data.retryAfter).toBe(42);
  });

  it("rateLimiterUnavailableResponse → 503 envelope + header", async () => {
    const res = rateLimiterUnavailableResponse(30);
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
    expectEnvelope(await res.json(), "RATE_LIMITER_UNAVAILABLE");
  });
});

describe("login errors carry the envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
  });

  it("missing fields → 400 INVALID_REQUEST", async () => {
    const res = await loginPOST(makeReq("/api/developers/auth/login", "POST", { email: "a@x.com" }));
    expect(res.status).toBe(400);
    expectEnvelope(await res.json(), "INVALID_REQUEST");
  });

  it("bad credentials → 401 INVALID_CREDENTIALS (message unchanged)", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue(null);
    const res = await loginPOST(
      makeReq("/api/developers/auth/login", "POST", { email: "a@x.com", password: "wrong" })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expectEnvelope(data, "INVALID_CREDENTIALS");
    expect(data.error).toBe("بيانات الدخول غير صحيحة");
  });

  it("suspended account → 403 ACCOUNT_SUSPENDED", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue({ status: "SUSPENDED", password: "h" });
    mockBcryptCompare.mockResolvedValue(true);
    const res = await loginPOST(
      makeReq("/api/developers/auth/login", "POST", { email: "a@x.com", password: "right" })
    );
    expect(res.status).toBe(403);
    expectEnvelope(await res.json(), "ACCOUNT_SUSPENDED");
  });
});

describe("auth/me + projects errors carry the envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("me without session → 401 AUTH_REQUIRED", async () => {
    mockGetDevSession.mockResolvedValue(null);
    const res = await meGET(makeReq("/api/developers/auth/me", "GET"));
    expect(res.status).toBe(401);
    expectEnvelope(await res.json(), "AUTH_REQUIRED");
  });

  it("projects GET without session → 401 AUTH_REQUIRED", async () => {
    mockGetDevSession.mockResolvedValue(null);
    const res = await projectsGET(makeReq("/api/developers/projects", "GET"));
    expect(res.status).toBe(401);
    expectEnvelope(await res.json(), "AUTH_REQUIRED");
  });

  it("projects POST invalid name → 400 INVALID_REQUEST", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockIsOwnerOnly.mockResolvedValue(false);
    const res = await projectsPOST(makeReq("/api/developers/projects", "POST", { name: "ab" }));
    expect(res.status).toBe(400);
    expectEnvelope(await res.json(), "INVALID_REQUEST");
  });
});

describe("OTP errors carry the envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
  });

  it("send without key → 401 INVALID_API_KEY", async () => {
    const res = await otpSendPOST(makeReq("/api/developers/otp/send", "POST", {}));
    expect(res.status).toBe(401);
    expectEnvelope(await res.json(), "INVALID_API_KEY");
  });

  it("verify with suspended owner's key → 401 INVALID_API_KEY", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue({
      status: "ACTIVE",
      projectId: "proj-1",
      project: {
        developerId: "dev-1",
        developer: { status: "ACTIVE" },
        owner: { status: "SUSPENDED" },
      },
    });
    const res = await otpVerifyPOST(
      makeReq("/api/developers/otp/verify", "POST", { token: "t", code: "1" }, { "x-api-key": "k" })
    );
    expect(res.status).toBe(401);
    expectEnvelope(await res.json(), "INVALID_API_KEY");
  });

  it("verify missing code → 400 INVALID_REQUEST", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue({
      status: "ACTIVE",
      projectId: "proj-1",
      project: {
        developerId: "dev-1",
        developer: { status: "ACTIVE" },
        owner: null,
      },
    });
    const res = await otpVerifyPOST(
      makeReq("/api/developers/otp/verify", "POST", { token: "t" }, { "x-api-key": "k" })
    );
    expect(res.status).toBe(400);
    expectEnvelope(await res.json(), "INVALID_REQUEST");
  });

  it("send with dead Redis (fail-closed) → 503 RATE_LIMITER_UNAVAILABLE", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue({
      status: "ACTIVE",
      projectId: "proj-1",
      project: {
        developerId: "dev-1",
        developer: { status: "ACTIVE" },
        owner: null,
        plan: "OWNER_PLAN",
        planRenewsAt: new Date(Date.now() + 86400000),
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 86400000),
        trialMessagesUsed: 0,
        trialWarningNotifiedAt: null,
        trialCreditsTotal: 30,
        trialCreditsUsed: 0,
        monthlyFreeTotal: 30,
        monthlyFreeUsed: 0,
        monthlyPeriodStart: null,
        monthlyPeriodEnd: null,
        paidBalanceEGP: 0,
        projectCreatedAt: new Date(),
        metaConnection: {
          accessToken: "enc",
          phoneNumberId: "pn",
          wabaId: "waba",
          displayPhone: "",
          isVerified: true,
        },
      },
    });
    mockPrisma.developerOtpTemplate.findUnique.mockResolvedValue({
      id: "tmpl-1",
      projectId: "proj-1",
      name: "otp_test",
      language: "ar",
      body: "{}",
      category: "AUTHENTICATION",
      status: "APPROVED",
      metaTemplateId: "meta-1",
      variables: null,
      metaComponents: [
        { type: "BODY", text: "{{1}} is your verification code." },
        { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
      ],
    });
    mockRateLimit.mockResolvedValue({ success: false, unavailable: true, retryAfter: 30 });

    const res = await otpSendPOST(
      makeReq(
        "/api/developers/otp/send",
        "POST",
        { phone: "+201012345678", templateId: "tmpl-1" },
        { "x-api-key": "k" }
      )
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
    expectEnvelope(await res.json(), "RATE_LIMITER_UNAVAILABLE");
  });
});
