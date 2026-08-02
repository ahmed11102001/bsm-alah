import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    findMany: vi.fn(),
  },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
}));

import { GET } from "@/app/api/developers/reports/route";
import { NextRequest } from "next/server";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/developers/reports", { method: "GET" });
}

describe("Developers Reports API — GET /api/developers/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("بدون session → 401", async () => {
    mockGetDevSession.mockResolvedValue(null);

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
  });

  it("بيحسب الـ KPIs والإحصائيات الشهرية صح", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86_400_000);

    const mockProjects = [
      {
        id: "proj-1",
        name: "مشروع 1",
        status: "ACTIVE",
        createdAt: tenDaysAgo,
        transferredAt: null,
        developerRemovedAt: null,
        ownerId: null,
        owner: null,
      },
      {
        id: "proj-2",
        name: "مشروع 2",
        status: "TRANSFERRED",
        createdAt: tenDaysAgo,
        transferredAt: fiveDaysAgo, // استغرق 5 أيام
        developerRemovedAt: null,
        ownerId: "owner-1",
        owner: { firstName: "Ahmed", lastName: "Hassan", email: "ahmed@test.com" },
      },
      {
        id: "proj-3",
        name: "مشروع 3",
        status: "ARCHIVED",
        createdAt: tenDaysAgo,
        transferredAt: null,
        developerRemovedAt: new Date(), // اتشال
        ownerId: "owner-2",
        owner: { firstName: "Sara", lastName: "Ali", email: "sara@test.com" },
      },
    ];

    mockPrisma.developerProject.findMany.mockResolvedValue(mockProjects);

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    const data = await res.json();

    // KPIs assertion
    expect(data.kpis.total).toBe(3);
    expect(data.kpis.active).toBe(1);
    expect(data.kpis.delivered).toBe(1);
    expect(data.kpis.removedFrom).toBe(1);
    expect(data.kpis.archived).toBe(1);
    // 1 delivered out of 3 = 33%
    expect(data.kpis.deliveryRate).toBe(33);
    // 2 distinct owners
    expect(data.kpis.distinctOwners).toBe(2);
    // avg delivery days = 5
    expect(data.kpis.avgDeliveryDays).toBe(5);

    // Monthly data assertion (12 months)
    expect(data.monthly).toHaveLength(12);

    // Projects list assertion
    expect(data.projects).toHaveLength(3);
    expect(data.projects[1].ownerName).toBe("Ahmed Hassan");
    expect(data.projects[1].ownerEmail).toBe("ahmed@test.com");
  });

  it("لما مفيش مشاريع مُسلَّمة → avgDeliveryDays بـ null و deliveryRate بـ 0", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerProject.findMany.mockResolvedValue([]);

    const res = await GET(makeReq());

    const data = await res.json();
    expect(data.kpis.total).toBe(0);
    expect(data.kpis.deliveryRate).toBe(0);
    expect(data.kpis.avgDeliveryDays).toBeNull();
  });
});
