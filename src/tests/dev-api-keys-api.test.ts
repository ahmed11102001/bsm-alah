import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerApiKey: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  developerProject: {
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
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

import { GET, POST, DELETE } from "@/app/api/developers/projects/[id]/api-keys/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(method: string, body?: object, searchParams?: string): NextRequest {
  const url = `http://localhost/api/developers/projects/proj-1/api-keys${searchParams ? `?${searchParams}` : ""}`;
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

const makeParams = (id = "proj-1") => Promise.resolve({ id });

describe("Developers API Keys API — /api/developers/projects/[id]/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the findUnique/update mocks for project trial logic in POST
    mockPrisma.developerProject.findUnique.mockResolvedValue(null);
    mockPrisma.developerProject.update.mockResolvedValue({});
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET
  // ═══════════════════════════════════════════════════════════════════════════
  describe("GET", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(401);
    });

    it("مشروع مش بتاعه → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue(null);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(404);
    });

    it("بيرجع الـ keys مرتبة", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });

      const keys = [
        {
          id: "key-1",
          keyPrefix: "wani_live_abc1",
          name: "Production",
          status: "ACTIVE",
          lastUsedAt: new Date(),
          createdAt: new Date(),
          revokedAt: null,
        },
        {
          id: "key-2",
          keyPrefix: "wani_live_abc2",
          name: null,
          status: "REVOKED",
          lastUsedAt: null,
          createdAt: new Date(),
          revokedAt: new Date(),
        },
      ];
      mockPrisma.developerApiKey.findMany.mockResolvedValue(keys);

      const res = await GET(makeReq("GET"), { params: makeParams() });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.keys).toHaveLength(2);
      expect(data.keys[0].keyPrefix).toBe("wani_live_abc1");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST
  // ═══════════════════════════════════════════════════════════════════════════
  describe("POST", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await POST(makeReq("POST", { name: "Key 1" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(401);
    });

    it("مشروع مش بتاعه → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue(null);

      const res = await POST(makeReq("POST", { name: "Key 1" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(404);
    });

    it("وصول الحد الأقصى 5 keys نشطين → 400", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerApiKey.count.mockResolvedValue(5);

      const res = await POST(makeReq("POST", { name: "Key 6" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("5");
    });

    it("إنشاء key ناجح → بيرجع fullKey + prefix + warning", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerApiKey.count.mockResolvedValue(2);
      mockPrisma.developerApiKey.create.mockResolvedValue({});

      const res = await POST(makeReq("POST", { name: "My Key" }), {
        params: makeParams(),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.key.fullKey).toContain("wani_live_");
      expect(data.key.prefix).toContain("wani_live_");
      expect(data.key.name).toBe("My Key");
      expect(data.warning).toBeDefined();
    });

    it("إنشاء بدون name → بيتخزن null", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerApiKey.count.mockResolvedValue(0);
      mockPrisma.developerApiKey.create.mockResolvedValue({});

      const res = await POST(makeReq("POST", {}), {
        params: makeParams(),
      });

      const data = await res.json();
      expect(data.key.name).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════════════════
  describe("DELETE", () => {
    it("بدون session → 401", async () => {
      mockGetDevSession.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE", undefined, "keyId=key-1"), {
        params: makeParams(),
      });

      expect(res.status).toBe(401);
    });

    it("بدون keyId → 400", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });

      const res = await DELETE(makeReq("DELETE"), {
        params: makeParams(),
      });

      expect(res.status).toBe(400);
    });

    it("key مش موجود → 404", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerApiKey.findFirst.mockResolvedValue(null);

      const res = await DELETE(makeReq("DELETE", undefined, "keyId=key-999"), {
        params: makeParams(),
      });

      expect(res.status).toBe(404);
    });

    it("revoke ناجح → ok + بيعمل update بـ REVOKED", async () => {
      mockGetDevSession.mockResolvedValue({ id: "dev-1" });
      mockGetProjectForOwnerOrDev.mockResolvedValue({ id: "proj-1" });
      mockPrisma.developerApiKey.findFirst.mockResolvedValue({
        id: "key-1",
        projectId: "proj-1",
        status: "ACTIVE",
      });
      mockPrisma.developerApiKey.update.mockResolvedValue({});

      const res = await DELETE(makeReq("DELETE", undefined, "keyId=key-1"), {
        params: makeParams(),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      expect(mockPrisma.developerApiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "key-1" },
          data: expect.objectContaining({ status: "REVOKED" }),
        })
      );
    });
  });
});
