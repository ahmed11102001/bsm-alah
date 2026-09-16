import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseIdentifier } from "@/lib/login-identifier";
import { verifySignupCode, SIGNUP_OTP_MINUTES, type SignupState } from "@/lib/signup-session";
import { hashOtpCode } from "@/lib/otp-redis";

function baseState(over: Partial<SignupState> = {}): SignupState {
  return {
    v: 1,
    context: "dashboard",
    google: { sub: "g1", email: "u@x.com", name: "U", picture: null },
    phone: "201012345678",
    passwordHash: "hashed",
    termsAcceptedAt: new Date().toISOString(),
    firstName: null,
    lastName: null,
    otpHash: null,
    otpExpiresAt: null,
    attempts: 0,
    resends: 0,
    resendsWindowStart: null,
    lastSentAt: null,
    verified: false,
    finalized: false,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("login-identifier", () => {
  it("يميز الإيميل وينظفه", () => {
    expect(parseIdentifier("  Ahmed@X.com ")).toEqual({ kind: "email", value: "ahmed@x.com" });
  });

  it("يميز الأرقام المصرية بكل الصيغ", () => {
    expect(parseIdentifier("01012345678")).toEqual({ kind: "phone", value: "201012345678" });
    expect(parseIdentifier("+201012345678")).toEqual({ kind: "phone", value: "201012345678" });
    expect(parseIdentifier("201012345678")).toEqual({ kind: "phone", value: "201012345678" });
  });

  it("يرفض القيم الفارغة والغامضة", () => {
    expect(parseIdentifier("")).toBeNull();
    expect(parseIdentifier("   ")).toBeNull();
    expect(parseIdentifier("abc")).toBeNull();
    expect(parseIdentifier("123")).toBeNull();
    expect(parseIdentifier(null)).toBeNull();
    expect(parseIdentifier(123 as any)).toBeNull();
  });
});

describe("signup OTP verify (pure)", () => {
  const CODE = "482913";
  function stateWithCode(code: string = CODE, expiresAt?: string): SignupState {
    return baseState({
      otpHash: hashOtpCode(code),
      otpExpiresAt: expiresAt ?? new Date(Date.now() + SIGNUP_OTP_MINUTES * 60 * 1000).toISOString(),
    });
  }

  it("الكود الصحيح ينجح", () => {
    expect(CODE).toMatch(/^\d{6}$/);
    expect(verifySignupCode(stateWithCode(), CODE)).toBe(true);
  });

  it("كود غلط → false", () => {
    expect(verifySignupCode(stateWithCode(), "000000")).toBe(false);
  });

  it("كود منتهي → false", () => {
    const expired = stateWithCode(CODE, new Date(Date.now() - 1000).toISOString());
    expect(verifySignupCode(expired, CODE)).toBe(false);
  });

  it("بدون otpHash → false", () => {
    expect(verifySignupCode(baseState(), "123456")).toBe(false);
  });
});

// ─── Portal login by phone ────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerUser: { findUnique: vi.fn(), findFirst: vi.fn() },
}));
const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
  signDevToken: vi.fn().mockResolvedValue("tok"),
  buildDevSessionCookie: vi.fn().mockReturnValue("c=v"),
}));
vi.mock("@/lib/dev-project-auth", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIP: () => "1.2.3.4",
}));
vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}));
vi.mock("@/lib/dev-role", () => ({
  isOwnerOnlyAccount: vi.fn().mockResolvedValue(false),
  getLatestOwnedProjectId: vi.fn().mockResolvedValue(null),
}));

import { POST as devLoginPOST } from "@/app/api/developers/auth/login/route";
import { NextRequest } from "next/server";

function loginReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/developers/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("portal login — email OR phone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("دخول برقم الهاتف يبحث بالصيغتين", async () => {
    mockPrisma.developerUser.findFirst.mockResolvedValue({
      id: "d1",
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      status: "ACTIVE",
      password: "h",
    });
    mockBcryptCompare.mockResolvedValue(true);

    const res = await devLoginPOST(loginReq({ email: "01012345678", password: "secret123" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.developerUser.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ phone: "201012345678" }, { phone: "+201012345678" }] },
    });
    expect(mockPrisma.developerUser.findUnique).not.toHaveBeenCalled();
  });

  it("دخول بإيميل يبحث بالإيميل", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue({
      id: "d1",
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      status: "ACTIVE",
      password: "h",
    });
    mockBcryptCompare.mockResolvedValue(true);

    const res = await devLoginPOST(loginReq({ email: "A@B.com", password: "secret123" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.developerUser.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
  });

  it("معرف غامض → 401 عام بدون بحث", async () => {
    const res = await devLoginPOST(loginReq({ email: "not-a-thing", password: "x" }));
    expect(res.status).toBe(401);
    expect(mockPrisma.developerUser.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.developerUser.findUnique).not.toHaveBeenCalled();
  });
});
