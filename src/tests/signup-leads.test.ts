import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  signupLead: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  developerUser: {
    findUnique: vi.fn(),
  },
}));

const mockCreateSignupSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/signup-session", () => ({
  createSignupSession: mockCreateSignupSession,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  getIP: () => "127.0.0.1",
}));

import {
  newResumeToken,
  hashResumeToken,
  normalizeLeadLocale,
  REMINDER_AFTER_HOURS,
  REMINDER_MAX_ATTEMPTS,
  RESUME_TOKEN_DAYS,
} from "@/lib/signup-leads";
import { renderSignupResumeEmail } from "@/lib/email-templates";
import { GET as resumeGET } from "@/app/api/auth/signup/resume/route";

// ── Helpers ──────────────────────────────────────────────────────────────────
function resumeReq(token: string): Request {
  return new Request(`http://localhost/api/auth/signup/resume?token=${token}`);
}

describe("Signup Leads — tokens & locale", () => {
  it("newResumeToken بصيغة 64-hex وhash ثابت", () => {
    const t = newResumeToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResumeToken(t)).toBe(hashResumeToken(t));
    expect(hashResumeToken(newResumeToken())).not.toBe(hashResumeToken(t));
  });

  it("normalizeLeadLocale: en/ar فقط", () => {
    expect(normalizeLeadLocale("en")).toBe("en");
    expect(normalizeLeadLocale("ar")).toBe("ar");
    expect(normalizeLeadLocale("fr")).toBe("ar");
    expect(normalizeLeadLocale(undefined)).toBe("ar");
  });

  it("ثوابت المهلة منطقية", () => {
    expect(REMINDER_AFTER_HOURS).toBe(24);
    expect(RESUME_TOKEN_DAYS).toBe(7);
    expect(REMINDER_MAX_ATTEMPTS).toBeGreaterThan(0);
  });
});

describe("Signup resume email template", () => {
  it("عربي للداشبورد: subject + لينك الاستكمال", () => {
    const out = renderSignupResumeEmail({
      name: "أحمد",
      resumeUrl: "https://aiwni.com/api/auth/signup/resume?token=abc",
      source: "DASHBOARD",
      locale: "ar",
    });
    expect(out.subject).toContain("منصة واني");
    expect(out.html).toContain("https://aiwni.com/api/auth/signup/resume?token=abc");
    expect(out.html).toContain('dir="rtl"');
    expect(out.text).toContain("7 أيام");
  });

  it("إنجليزي للبورتال", () => {
    const out = renderSignupResumeEmail({
      name: "John",
      resumeUrl: "https://aiwni.com/api/auth/signup/resume?token=abc",
      source: "PORTAL",
      locale: "en",
    });
    expect(out.subject).toContain("Developer Portal");
    expect(out.html).toContain('dir="ltr"');
    expect(out.text).toContain("7 days");
  });
});

describe("GET /api/auth/signup/resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("توكن بصيغة غلط → تحويل لبداية التسجيل", async () => {
    const res = await resumeGET(resumeReq("not-a-token"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/auth?mode=signup");
  });

  it("توكن منتهي → تحويل لبداية التسجيل", async () => {
    const token = "a".repeat(64);
    mockPrisma.signupLead.findUnique.mockResolvedValue({
      id: "sl-1",
      email: "x@test.com",
      status: "PENDING",
      resumeTokenHash: "zzz",
      resumeExpiresAt: new Date(Date.now() - 1000), // منتهي
      googleSub: "sub-1",
      source: "DASHBOARD",
      locale: "ar",
      name: "X",
    });

    const res = await resumeGET(resumeReq(token));
    expect(res.status).toBe(307);
    expect(mockCreateSignupSession).not.toHaveBeenCalled();
  });

  it("توكن سليم وإيميل لسه مسجلش → جلسة جديدة + تحويل لخطوة الرقم", async () => {
    const raw = "b".repeat(64);
    mockPrisma.signupLead.findUnique.mockResolvedValue({
      id: "sl-1",
      email: "new@test.com",
      name: "New User",
      status: "PENDING",
      resumeTokenHash: "hash",
      resumeExpiresAt: new Date(Date.now() + 86400000),
      googleSub: "google-sub-1",
      source: "DASHBOARD",
      locale: "ar",
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockCreateSignupSession.mockResolvedValue({ token: "f".repeat(64), state: {} });

    const res = await resumeGET(resumeReq(raw));
    expect(res.status).toBe(307);
    expect(mockCreateSignupSession).toHaveBeenCalledWith(
      "dashboard",
      expect.objectContaining({ email: "new@test.com", sub: "google-sub-1" })
    );
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("mode=signup");
    expect(loc).toContain(`signupToken=${"f".repeat(64)}`);
  });

  it("الإيميل كمّل في النص → تحويل لتسجيل الدخول", async () => {
    const raw = "c".repeat(64);
    mockPrisma.signupLead.findUnique.mockResolvedValue({
      id: "sl-1",
      email: "done@test.com",
      name: "Done",
      status: "PENDING",
      resumeTokenHash: "hash",
      resumeExpiresAt: new Date(Date.now() + 86400000),
      googleSub: "google-sub-1",
      source: "DASHBOARD",
      locale: "en",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1" });

    const res = await resumeGET(resumeReq(raw));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("mode=login");
    expect(mockCreateSignupSession).not.toHaveBeenCalled();
    expect(mockPrisma.signupLead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: "done@test.com" }) })
    );
  });
});
