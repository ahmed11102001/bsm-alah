import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  otpLog: {
    count: vi.fn(),
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

import { GET, DELETE } from "@/app/api/developers/projects/[id]/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(method: string): NextRequest {
  return new NextRequest(
    "http://localhost/api/developers/projects/proj-1",
    { method }
  );
}

const makeParams = (id = "proj-1") => Promise.resolve({ id });

describe("Developers Project Detail API — /api/developers/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/developers/projects/[id]
  // ═══════════════════════════════════════════════════════════════════════════
  describe("GET", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(401);
    });

    it("مشروع مش موجود (getProjectForOwnerOrDeveloper → null) → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue(null);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(404);
    });

    it("بيرجع التفاصيل الكاملة + otpToday + viewerRole", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({
        id: "proj-1",
        developerId: "dev-1",
        ownerId: "owner-1",
        status: "ACTIVE",
      });

      const projectDetails = {
        id: "proj-1",
        name: "مشروع",
        description: "وصف",
        status: "ACTIVE",
        developerId: "dev-1",
        ownerId: "owner-1",
        metaConnection: {
          id: "meta-1",
          wabaId: "waba-1",
          phoneNumberId: "phone-1",
          displayPhone: "+201234567890",
          isVerified: true,
          connectedAt: new Date(),
        },
        _count: { apiKeys: 2, otpTemplates: 1 },
        owner: { id: "owner-1", firstName: "Ahmed", lastName: "Ali", email: "a@b.com" },
        developer: { id: "dev-1", firstName: "Mohamed", lastName: "Hassan", email: "m@b.com" },
      };
      mockPrisma.developerProject.findFirst.mockResolvedValue(projectDetails);
      mockPrisma.otpLog.count.mockResolvedValue(15);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.project.id).toBe("proj-1");
      expect(data.project.otpToday).toBe(15);
      // dev-1 مش الأونر → viewerRole = developer
      expect(data.project.viewerRole).toBe("developer");
    });

    it("الأونر بيشوف المشروع → viewerRole = owner", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({
        id: "proj-1",
        ownerId: "owner-1",
      });

      mockPrisma.developerProject.findFirst.mockResolvedValue({
        id: "proj-1",
        ownerId: "owner-1",
        developerId: "dev-1",
        metaConnection: null,
        _count: { apiKeys: 0, otpTemplates: 0 },
        owner: null,
        developer: null,
      });
      mockPrisma.otpLog.count.mockResolvedValue(0);

      const res = await GET(makeReq("GET"), { params: makeParams() });
      const data = await res.json();

      expect(data.project.viewerRole).toBe("owner");
    });

    it("Prisma findFirst ترجع null بعد auth pass → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerProject.findFirst.mockResolvedValue(null);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/developers/projects/[id]
  // ═══════════════════════════════════════════════════════════════════════════
  describe("DELETE", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE"), { params: makeParams() });

      expect(res.status).toBe(401);
    });

    it("مشروع مش موجود → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE"), { params: makeParams() });

      expect(res.status).toBe(404);
    });

    it("مشروع TRANSFERRED → 400 (مينفعش يتحذف)", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({
        id: "proj-1",
        status: "TRANSFERRED",
      });

      const res = await DELETE(makeReq("DELETE"), { params: makeParams() });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("حذف ناجح → ok + status = ARCHIVED", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({
        id: "proj-1",
        status: "ACTIVE",
      });
      mockPrisma.developerProject.update.mockResolvedValue({});

      const res = await DELETE(makeReq("DELETE"), { params: makeParams() });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      // التحقق إن Update بـ ARCHIVED
      expect(mockPrisma.developerProject.update).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        data: { status: "ARCHIVED" },
      });
    });
  });
});
