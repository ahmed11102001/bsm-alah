import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  campaign: { groupBy: vi.fn() },
  message: { findMany: vi.fn() },
  automationAnalytics: { groupBy: vi.fn() },
  automationRule: { findMany: vi.fn() },
  aIAgent: { findUnique: vi.fn() },
  contact: { findMany: vi.fn() },
}));

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

import { GET } from "@/app/api/dashboard/overview/route";
import { NextRequest } from "next/server";

function getReq(): NextRequest {
  return new NextRequest("http://localhost/api/dashboard/overview?range=7d");
}

function daysAgo(n: number, h = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
}

describe("GET /api/dashboard/overview — aiAgentDaily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { id: "owner-1", parentId: null } });
    mockPrisma.campaign.groupBy.mockResolvedValue([]);
    mockPrisma.automationAnalytics.groupBy.mockResolvedValue([]);
    mockPrisma.automationRule.findMany.mockResolvedValue([]);
    mockPrisma.aIAgent.findUnique.mockResolvedValue(null);
    mockPrisma.contact.findMany.mockResolvedValue([]);
  });

  it("بيرجع 7 أيام بآخر 7 أيام وبيعد ردود الوكيل صح", async () => {
    // ملحوظة: الـ route بيجمّع بتوقيت UTC (نفس سلوك رسم الأداء الحالي) —
    // فالرسائل المحطوطة في الاختبار بعيدة عن حد اليوم عشان النتيجة ثابتة
    // تحت أي timezone
    mockPrisma.message.findMany.mockResolvedValue([
      // من يوم: 2 رد AI
      { createdAt: daysAgo(1), direction: "outbound", status: "delivered", senderType: "ai" },
      { createdAt: daysAgo(1), direction: "outbound", status: "sent", senderType: "ai" },
      // من يومين: 1 رد AI + رسالة بشرية (متتحسبش)
      { createdAt: daysAgo(2), direction: "outbound", status: "read", senderType: "ai" },
      { createdAt: daysAgo(2), direction: "outbound", status: "delivered", senderType: "human" },
      // من 4 أيام: وارد عادي (متتحسبش)
      { createdAt: daysAgo(4), direction: "inbound", status: "delivered", senderType: "human" },
      // (فلترة النطاق الزمني مسؤولية الـ where في الـ DB — الـ mock بيرجع الداخل بس)
    ]);

    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data.aiAgentDaily)).toBe(true);
    expect(data.aiAgentDaily.length).toBe(7);

    // الأيام متتالية بفرق يوم واحد
    const times = data.aiAgentDaily.map((d: any) => new Date(`${d.date}T00:00:00Z`).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBe(86400000);
    }

    // 2 رد النهاردة + 1 امبارح = 3، والباقي أصفار (البشري والوارد وبرا النطاق متتحسبش)
    const counts = data.aiAgentDaily.map((d: any) => d.count).sort((a: number, b: number) => b - a);
    expect(counts).toEqual([2, 1, 0, 0, 0, 0, 0]);
    expect(data.aiAgentDaily.reduce((s: number, d: any) => s + d.count, 0)).toBe(3);

    // الإجمالي لسه موجود ومتوافق
    expect(data.aiAgentReplies).toBe(3);
  });

  it("بدون رسائل → 7 أصفار", async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);

    const res = await GET(getReq());
    const data = await res.json();

    expect(data.aiAgentDaily.length).toBe(7);
    expect(data.aiAgentDaily.every((d: any) => d.count === 0)).toBe(true);
    expect(data.aiAgentReplies).toBe(0);
  });
});
