import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerProject: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockIsOwnerOnly = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
}));
vi.mock("@/lib/dev-role", () => ({
  isOwnerOnlyAccount: mockIsOwnerOnly,
}));

import { GET, POST } from "@/app/api/developers/projects/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(method: string, body?: object): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest("http://localhost/api/developers/projects", init);
}

describe("Developers Projects API — /api/developers/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/developers/projects
  // ═══════════════════════════════════════════════════════════════════════════
  describe("GET", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await GET(makeReq("GET"));

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("بيرجع المشاريع مع viewerRole و canEnter", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockPrisma.developerProject.findMany.mockResolvedValue([
        {
          id: "proj-1",
          name: "تطبيق 1",
          description: null,
          status: "ACTIVE",
          createdAt: new Date(),
          transferredAt: null,
          transferredToUserId: null,
          developerId: "dev-1",
          ownerId: null,
          developerRemovedAt: null,
        },
        {
          id: "proj-2",
          name: "تطبيق 2",
          description: "وصف",
          status: "ACTIVE",
          createdAt: new Date(),
          transferredAt: null,
          transferredToUserId: null,
          developerId: "dev-1",
          ownerId: "owner-1",
          developerRemovedAt: null,
        },
      ]);

      const res = await GET(makeReq("GET"));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.projects).toHaveLength(2);
      // proj-1: هو المطوّر ومفيش أونر → viewerRole = developer
      expect(data.projects[0].viewerRole).toBe("developer");
      expect(data.projects[0].canEnter).toBe(true);
      // proj-2: هو المطوّر والأونر حد تاني → developer
      expect(data.projects[1].viewerRole).toBe("developer");
      expect(data.projects[1].canEnter).toBe(true);
    });

    it("أونر بيشوف المشروع بتاعه → viewerRole = owner", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockPrisma.developerProject.findMany.mockResolvedValue([
        {
          id: "proj-1",
          name: "مشروع العميل",
          status: "ACTIVE",
          createdAt: new Date(),
          developerId: "dev-1",
          ownerId: "owner-1",
          developerRemovedAt: null,
        },
      ]);

      const res = await GET(makeReq("GET"));
      const data = await res.json();

      expect(data.projects[0].viewerRole).toBe("owner");
      expect(data.projects[0].canEnter).toBe(true);
    });

    it("مطوّر اتشال (developerRemovedAt مش null) → canEnter = false", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockPrisma.developerProject.findMany.mockResolvedValue([
        {
          id: "proj-1",
          name: "مشروع",
          status: "ACTIVE",
          createdAt: new Date(),
          developerId: "dev-1",
          ownerId: "owner-1",
          developerRemovedAt: new Date(), // اتشال!
        },
      ]);

      const res = await GET(makeReq("GET"));
      const data = await res.json();

      expect(data.projects[0].viewerRole).toBe("developer");
      expect(data.projects[0].canEnter).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/developers/projects
  // ═══════════════════════════════════════════════════════════════════════════
  describe("POST", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await POST(makeReq("POST", { name: "test" }));

      expect(res.status).toBe(401);
    });

    it("أونر (ownerOnly) بيحاول ينشئ → 403", async () => {
      mockGetDevSession.mockResolvedValue({ id: "owner-1" });
      mockIsOwnerOnly.mockResolvedValue(true);

      const res = await POST(makeReq("POST", { name: "مشروع جديد" }));

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("بدون اسم مشروع → 400", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockIsOwnerOnly.mockResolvedValue(false);

      const res = await POST(makeReq("POST", { name: "" }));

      expect(res.status).toBe(400);
    });

    it("اسم أقل من 3 حروف → 400", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockIsOwnerOnly.mockResolvedValue(false);

      const res = await POST(makeReq("POST", { name: "ab" }));

      expect(res.status).toBe(400);
    });

    it("إنشاء مشروع ناجح → 201", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockIsOwnerOnly.mockResolvedValue(false);

      const mockProject = {
        id: "proj-new",
        name: "مشروع جديد",
        description: "وصف",
        status: "ACTIVE",
        developerId: "dev-1",
        createdAt: new Date(),
      };
      mockPrisma.developerProject.create.mockResolvedValue(mockProject);

      const res = await POST(
        makeReq("POST", { name: "مشروع جديد", description: "وصف" })
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.project.name).toBe("مشروع جديد");

      // التحقق من الـ data المبعوتة لـ Prisma
      expect(mockPrisma.developerProject.create).toHaveBeenCalledWith({
        data: {
          developerId: "dev-1",
          name: "مشروع جديد",
          description: "وصف",
        },
      });
    });

    it("إنشاء بدون description → بيتبعت null", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockIsOwnerOnly.mockResolvedValue(false);
      mockPrisma.developerProject.create.mockResolvedValue({
        id: "proj-new",
        name: "تيست",
        description: null,
      });

      await POST(makeReq("POST", { name: "تيست" }));

      expect(mockPrisma.developerProject.create).toHaveBeenCalledWith({
        data: {
          developerId: "dev-1",
          name: "تيست",
          description: null,
        },
      });
    });
  });
});
