import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  teamInvitation: {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockSendTeamInviteEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));
vi.mock("@/lib/permissions", () => ({
  requirePermission: () => null,
}));
vi.mock("@/lib/plan-guard", () => ({
  checkTeamLimit: vi.fn().mockResolvedValue({ allowed: true }),
  guardResponse: () => null,
}));
vi.mock("@/lib/email", () => ({
  sendTeamInviteEmail: mockSendTeamInviteEmail,
}));
vi.mock("@/lib/locale-resolver", () => ({
  getRequestLocale: () => "ar",
}));

import { POST as invitePost } from "@/app/api/team/route";
import { POST as resendPost } from "@/app/api/team/resend/route";

function makeReq(body: object): Request {
  return new Request("http://localhost/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Team invite — email failure is surfaced to the owner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } });
    mockSendTeamInviteEmail.mockResolvedValue(undefined);
  });

  it("POST /api/team ناجح → بيبعت الإيميل ويرجع success", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null); // مش عضو حالي
    mockPrisma.teamInvitation.findFirst.mockResolvedValue(null); // مفيش دعوة معلقة
    mockPrisma.teamInvitation.create.mockResolvedValue({
      id: "inv-1",
      email: "agent@company.com",
      name: "Agent",
      role: "CHAT_ONLY",
      status: "PENDING",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Owner", brandName: "Shop" });

    const res = await invitePost(
      makeReq({ email: "agent@company.com", name: "Agent", role: "CHAT_ONLY" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSendTeamInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "agent@company.com" })
    );
    expect(mockPrisma.teamInvitation.delete).not.toHaveBeenCalled();
  });

  it("POST /api/team والإيميل فشل → 502 EMAIL_FAILED والدعوة الميتة بتتمسح", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.teamInvitation.findFirst.mockResolvedValue(null);
    mockPrisma.teamInvitation.create.mockResolvedValue({
      id: "inv-1",
      email: "agent@company.com",
      name: "Agent",
      role: "CHAT_ONLY",
      status: "PENDING",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Owner", brandName: "Shop" });
    mockSendTeamInviteEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const res = await invitePost(
      makeReq({ email: "agent@company.com", name: "Agent", role: "CHAT_ONLY" })
    );

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.code).toBe("EMAIL_FAILED");
    expect(data.error).toBeDefined();
    // الدعوة الميتة اتمسحت عشان المحاولة الجديدة متتبلوكش بـ "توجد دعوة معلقة"
    expect(mockPrisma.teamInvitation.delete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
  });

  it("POST /api/team/resend والإيميل فشل → 502 بدل نجاح وهمي", async () => {
    mockPrisma.teamInvitation.findFirst.mockResolvedValue({
      id: "inv-1",
      email: "agent@company.com",
      name: "Agent",
      role: "CHAT_ONLY",
      status: "PENDING",
      lastSentAt: new Date(Date.now() - 10 * 60 * 1000), // من 10 دقايق (خارج الـ cooldown)
    });
    mockPrisma.teamInvitation.update.mockResolvedValue({ id: "inv-1" });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Owner", brandName: "Shop" });
    mockSendTeamInviteEmail.mockRejectedValueOnce(new Error("SMTP down"));

    const res = await resendPost(makeReq({ invitationId: "inv-1" }));

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.code).toBe("EMAIL_FAILED");
  });

  it("POST /api/team/resend ناجح → بيبعت الإيميل ويرجع success", async () => {
    mockPrisma.teamInvitation.findFirst.mockResolvedValue({
      id: "inv-1",
      email: "agent@company.com",
      name: "Agent",
      role: "CHAT_ONLY",
      status: "PENDING",
      lastSentAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    mockPrisma.teamInvitation.update.mockResolvedValue({ id: "inv-1" });
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Owner", brandName: "Shop" });

    const res = await resendPost(makeReq({ invitationId: "inv-1" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSendTeamInviteEmail).toHaveBeenCalled();
  });
});
