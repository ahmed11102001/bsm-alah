import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  otpLog: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockGetProjectForOwnerOrDev = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
}));
vi.mock("@/lib/dev-project-auth", () => ({
  getProjectForOwnerOrDeveloper: mockGetProjectForOwnerOrDev,
}));

import { GET } from "@/app/api/developers/projects/[id]/logs/route";
import { NextRequest } from "next/server";

function makeReq(search = "page=1&limit=20"): NextRequest {
  return new NextRequest(`http://localhost/api/developers/projects/proj-A/logs?${search}`, {
    method: "GET",
  });
}
const makeParams = () => Promise.resolve({ id: "proj-A" });

describe("Developers Project Logs — /api/developers/projects/[id]/logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-A" });
    mockPrisma.otpLog.findMany.mockResolvedValue([]);
    mockPrisma.otpLog.count.mockResolvedValue(0);
    mockPrisma.otpLog.groupBy.mockResolvedValue([]);
  });

  it("بدون session → 401", async () => {
    mockGetDevSession.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: makeParams() });
    expect(res.status).toBe(401);
  });

  it("مشروع مش بتاعه → 404", async () => {
    mockGetProjectForOwnerOrDev.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it("يرجع logs + total + pages + stats — وSENT تُعرض PENDING", async () => {
    mockPrisma.otpLog.findMany.mockResolvedValue([
      {
        id: "l1", phone: "2010", status: "SENT", error: null,
        sentAt: new Date().toISOString(), verifiedAt: null,
        expiredAt: null, failedAt: null, createdAt: new Date().toISOString(),
      },
    ]);
    mockPrisma.otpLog.count.mockResolvedValue(1);
    mockPrisma.otpLog.groupBy.mockResolvedValue([
      { status: "SENT", _count: { status: 1 } },
    ]);
    const res = await GET(makeReq(), { params: makeParams() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.logs[0].status).toBe("PENDING");
    expect(data.stats.PENDING).toBe(1);
    expect(data.logs[0]).not.toHaveProperty("code");
  });

  it("فلتر status غير صالح → 400", async () => {
    const res = await GET(makeReq("page=1&limit=20&status=BOGUS"), { params: makeParams() });
    expect(res.status).toBe(400);
  });

  it("فلتر PENDING يشمل SENT في الـ where", async () => {
    await GET(makeReq("page=1&limit=20&status=PENDING"), { params: makeParams() });
    expect(mockPrisma.otpLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: "proj-A", status: { in: ["PENDING", "SENT"] } }),
      })
    );
  });

  it("دائمًا مقيد بالمشروع — لا تسريب عبر المشاريع", async () => {
    await GET(makeReq(), { params: makeParams() });
    expect(mockPrisma.otpLog.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: "proj-A" }) })
    );
  });
});
