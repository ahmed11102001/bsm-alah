import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  developerProjectInvite: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockGetProjectForOwner = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
}));
vi.mock("@/lib/dev-project-auth", () => ({
  getProjectForOwner: mockGetProjectForOwner,
}));

import { POST, DELETE } from "@/app/api/developers/projects/[id]/transfer/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(method: string, body?: object): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest("http://localhost/api/developers/projects/proj-1/transfer", init);
}

const makeParams = (id = "proj-1") => Promise.resolve({ id });

describe("Developers Transfer API — /api/developers/projects/[id]/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/developers/projects/[id]/transfer
  // ═══════════════════════════════════════════════════════════════════════════
  describe("POST", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await POST(makeReq("POST", { email: "client@test.com", role: "OWNER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(401);
    });

    it("بيانات غير صالحة (role مش OWNER ولا DEVELOPER) → 400", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });

      const res = await POST(makeReq("POST", { email: "client@test.com", role: "ADMIN" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("دعوة OWNER والمشروع عنده مالك بالفعل → 409", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockPrisma.developerProject.findFirst.mockResolvedValue({
        id: "proj-1",
        developerId: "dev-1",
        ownerId: "existing-owner",
        status: "ACTIVE",
      });

      const res = await POST(makeReq("POST", { email: "newowner@test.com", role: "OWNER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("عنده مالك بالفعل");
    });

    it("دعوة OWNER والمشروع ليس للمطور (غير مصرح) → 403", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockPrisma.developerProject.findFirst.mockResolvedValue(null);

      const res = await POST(makeReq("POST", { email: "newowner@test.com", role: "OWNER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(403);
    });

    it("دعوة OWNER ناجحة → بيرجع ok وكود الدعوة 8 أحرف", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockPrisma.developerProject.findFirst.mockResolvedValue({
        id: "proj-1",
        developerId: "dev-1",
        ownerId: null,
        status: "ACTIVE",
      });
      mockPrisma.developerProjectInvite.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.developerProjectInvite.create.mockResolvedValue({});

      const res = await POST(makeReq("POST", { email: "client@test.com", role: "OWNER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(typeof data.code).toBe("string");
      expect(data.code.length).toBe(8);

      expect(mockPrisma.developerProjectInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: "proj-1",
            email: "client@test.com",
            role: "OWNER",
            createdById: "dev-1",
            status: "PENDING",
          }),
        })
      );
    });

    it("دعوة DEVELOPER من المالك والمطور نشط بالفعل → 409", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockGetProjectForOwner.mockResolvedValue({
        id: "proj-1",
        ownerId: "owner-1",
        developerRemovedAt: null, // مطور نشط
      });

      const res = await POST(makeReq("POST", { email: "dev2@test.com", role: "DEVELOPER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(409);
    });

    it("دعوة DEVELOPER ناجحة بعد إزالة المطور السابق", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockGetProjectForOwner.mockResolvedValue({
        id: "proj-1",
        ownerId: "owner-1",
        developerRemovedAt: new Date(), // المطور سابق مًزال
      });
      mockPrisma.developerProjectInvite.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.developerProjectInvite.create.mockResolvedValue({});

      const res = await POST(makeReq("POST", { email: "dev2@test.com", role: "DEVELOPER" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.code).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/developers/projects/[id]/transfer
  // ═══════════════════════════════════════════════════════════════════════════
  describe("DELETE", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE"), {
        params: makeParams(),
      });

      expect(res.status).toBe(401);
    });

    it("مش المالك (getProjectForOwner → null) → 403", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwner.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE"), {
        params: makeParams(),
      });

      expect(res.status).toBe(403);
    });

    it("المالك بيزيل المطور بنجاح → ok و developerRemovedAt بيتحدث", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockGetProjectForOwner.mockResolvedValue({
        id: "proj-1",
        ownerId: "owner-1",
      });
      mockPrisma.developerProject.update.mockResolvedValue({});

      const res = await DELETE(makeReq("DELETE"), {
        params: makeParams(),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      expect(mockPrisma.developerProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "proj-1" },
          data: expect.objectContaining({
            developerRemovedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});
