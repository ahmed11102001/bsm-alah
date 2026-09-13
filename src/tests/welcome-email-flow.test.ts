import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (callbackOrArr) => {
    if (typeof callbackOrArr === "function") {
      return callbackOrArr(mockPrisma);
    }
    return Promise.all(callbackOrArr);
  }),
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  subscription: {
    create: vi.fn(),
    findUnique: vi.fn().mockResolvedValue(null),
  },
  emailVerificationToken: {
    create: vi.fn(),
  },
  message: {
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  campaign: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
  },
  contact: {
    count: vi.fn().mockResolvedValue(0),
  },
  whatsAppAccount: {
    findUnique: vi.fn().mockResolvedValue(null),
  },
  testimonial: {
    count: vi.fn().mockResolvedValue(0),
  },
}));

const mockSendWelcomeEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSendVerificationEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));
const mockGetPlanStatus = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    status: "active",
    plan: "free",
    limits: { aiTokensPerMonth: 1000 },
  })
);

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendVerificationEmail: mockSendVerificationEmail,
}));
vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  getIP: () => "127.0.0.1",
}));
vi.mock("@/lib/plan-guard", () => ({
  getPlanStatus: mockGetPlanStatus,
}));

import { POST as registerPOST } from "@/app/api/register/route";
import { GET as dashboardGET } from "@/app/api/dashboard/route";
import { POST as onboardingPOST } from "@/app/api/onboarding/route";
import { NextRequest } from "next/server";

describe("Delayed Welcome Email Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT send welcome email during manual registration (only verification email)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u_manual_1",
      email: "test@example.com",
      name: "Ahmed",
      phone: "201000000001",
      role: "OWNER",
    });
    mockPrisma.subscription.create.mockResolvedValue({});
    mockPrisma.emailVerificationToken.create.mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ahmed",
        email: "test@example.com",
        password: "Password123!",
        phone: "+201000000001",
      }),
    });

    const res = await registerPOST(req);
    expect(res.status).toBe(201);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("sends welcome email when user verifies email and enters dashboard for the first time", async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "u_manual_1",
        email: "test@example.com",
        name: "Ahmed",
        role: "OWNER",
      },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u_manual_1",
      name: "Ahmed",
      email: "test@example.com",
      phone: "201000000001",
      image: null,
      role: "OWNER",
      password: "hash",
      onboardingCompleted: true,
      emailVerified: new Date(),
      welcomeEmailSentAt: null,
    });

    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/dashboard", {
      method: "GET",
    });

    const res = await dashboardGET(req);
    expect(res.status).toBe(200);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u_manual_1", welcomeEmailSentAt: null },
      data: expect.objectContaining({ welcomeEmailSentAt: expect.any(Date) }),
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("test@example.com", "Ahmed", expect.any(String));
  });

  it("does NOT send welcome email again on subsequent dashboard visits", async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "u_manual_1",
        email: "test@example.com",
        name: "Ahmed",
        role: "OWNER",
      },
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u_manual_1",
      name: "Ahmed",
      email: "test@example.com",
      phone: "201000000001",
      image: null,
      role: "OWNER",
      password: "hash",
      onboardingCompleted: true,
      emailVerified: new Date(),
      welcomeEmailSentAt: new Date(), // Already sent
    });

    const req = new NextRequest("http://localhost/api/dashboard", {
      method: "GET",
    });

    const res = await dashboardGET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("sends welcome email and records timestamp when Google user finishes onboarding", async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "u_google_1",
        email: "google@example.com",
        name: "Google User",
        needsOnboarding: true,
      },
    });

    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ phone: "+201011112222" }),
    });

    const res = await onboardingPOST(req);
    expect(res.status).toBe(200);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u_google_1" },
      data: expect.objectContaining({
        phone: "201011112222",
        onboardingCompleted: true,
        welcomeEmailSentAt: expect.any(Date),
      }),
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("google@example.com", "Google User", expect.any(String));
  });
});
