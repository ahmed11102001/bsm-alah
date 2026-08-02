import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

const mockSignDevToken = vi.hoisted(() => vi.fn());
const mockBuildDevSessionCookie = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn());
const mockIsOwnerOnly = vi.hoisted(() => vi.fn());
const mockGetLatestOwnedProjectId = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());
const mockBcryptHash = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  signDevToken: mockSignDevToken,
  buildDevSessionCookie: mockBuildDevSessionCookie,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));
vi.mock("@/lib/dev-role", () => ({
  isOwnerOnlyAccount: mockIsOwnerOnly,
  getLatestOwnedProjectId: mockGetLatestOwnedProjectId,
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: any[]) => mockBcryptCompare(...args),
    hash: (...args: any[]) => mockBcryptHash(...args),
  },
}));

import { POST as loginPOST } from "@/app/api/developers/auth/login/route";
import { POST as registerPOST } from "@/app/api/developers/auth/register/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Developers Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit always passes
    mockRateLimit.mockResolvedValue({ success: true });
    mockSignDevToken.mockResolvedValue("mock-token");
    mockBuildDevSessionCookie.mockReturnValue("dev-session=mock-token; HttpOnly; Path=/");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/developers/auth/login
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Login — POST /api/developers/auth/login", () => {
    const url = "http://localhost/api/developers/auth/login";

    it("بيانات ناقصة (بدون email) → 400", async () => {
      const res = await loginPOST(makeReq(url, { password: "12345678" }));

      expect(res.status).toBe(400);
    });

    it("بيانات ناقصة (بدون password) → 400", async () => {
      const res = await loginPOST(makeReq(url, { email: "dev@test.com" }));

      expect(res.status).toBe(400);
    });

    it("Rate limit exceeded → 429", async () => {
      mockRateLimit.mockResolvedValue({ success: false, retryAfter: 30 });

      const res = await loginPOST(
        makeReq(url, { email: "dev@test.com", password: "12345678" })
      );

      expect(res.status).toBe(429);
    });

    it("يوزر مش موجود → 401", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue(null);

      const res = await loginPOST(
        makeReq(url, { email: "nobody@test.com", password: "12345678" })
      );

      expect(res.status).toBe(401);
    });

    it("باسورد غلط → 401", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue({
        id: "dev-1",
        email: "dev@test.com",
        password: "hashed-pass",
        firstName: "Ahmed",
        lastName: "Ali",
        status: "ACTIVE",
      });
      mockBcryptCompare.mockResolvedValue(false);

      const res = await loginPOST(
        makeReq(url, { email: "dev@test.com", password: "wrong-pass" })
      );

      expect(res.status).toBe(401);
    });

    it("حساب SUSPENDED → 403", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue({
        id: "dev-1",
        email: "dev@test.com",
        password: "hashed-pass",
        firstName: "Ahmed",
        lastName: "Ali",
        status: "SUSPENDED",
      });
      mockBcryptCompare.mockResolvedValue(true);

      const res = await loginPOST(
        makeReq(url, { email: "dev@test.com", password: "12345678" })
      );

      expect(res.status).toBe(403);
    });

    it("دخول ناجح → Set-Cookie + redirect للبورتال", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue({
        id: "dev-1",
        email: "dev@test.com",
        password: "hashed-pass",
        firstName: "Ahmed",
        lastName: "Ali",
        status: "ACTIVE",
      });
      mockBcryptCompare.mockResolvedValue(true);
      mockIsOwnerOnly.mockResolvedValue(false);

      const res = await loginPOST(
        makeReq(url, { email: "dev@test.com", password: "12345678" })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.redirect).toBe("/developers/portal");
      expect(res.headers.get("set-cookie")).toContain("dev-session");
    });

    it("أونر بس → redirect لمشروعه مباشرة", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue({
        id: "owner-1",
        email: "owner@test.com",
        password: "hashed-pass",
        firstName: "Owner",
        lastName: "User",
        status: "ACTIVE",
      });
      mockBcryptCompare.mockResolvedValue(true);
      mockIsOwnerOnly.mockResolvedValue(true);
      mockGetLatestOwnedProjectId.mockResolvedValue("proj-99");

      const res = await loginPOST(
        makeReq(url, { email: "owner@test.com", password: "12345678" })
      );

      const data = await res.json();
      expect(data.redirect).toBe("/developers/portal/projects/proj-99");
    });

    it("Login بيعمل toLowerCase للإيميل", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue(null);

      await loginPOST(
        makeReq(url, { email: "DEV@TEST.COM", password: "12345678" })
      );

      expect(mockPrisma.developerUser.findUnique).toHaveBeenCalledWith({
        where: { email: "dev@test.com" },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/developers/auth/register
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Register — POST /api/developers/auth/register", () => {
    const url = "http://localhost/api/developers/auth/register";

    const validBody = {
      firstName: "Ahmed",
      lastName: "Ali",
      phone: "01012345678",
      email: "ahmed@test.com",
      password: "securePassword123",
    };

    it("بدون firstName → 400", async () => {
      const res = await registerPOST(
        makeReq(url, { ...validBody, firstName: "" })
      );

      expect(res.status).toBe(400);
    });

    it("اسم أقل من حرفين → 400", async () => {
      const res = await registerPOST(
        makeReq(url, { ...validBody, firstName: "A" })
      );

      expect(res.status).toBe(400);
    });

    it("بدون رقم موبايل → 400", async () => {
      const res = await registerPOST(
        makeReq(url, { ...validBody, phone: "" })
      );

      expect(res.status).toBe(400);
    });

    it("رقم موبايل غلط → 400", async () => {
      const res = await registerPOST(
        makeReq(url, { ...validBody, phone: "12345" })
      );

      expect(res.status).toBe(400);
    });

    it("باسورد أقل من 8 أحرف → 400", async () => {
      const res = await registerPOST(
        makeReq(url, { ...validBody, password: "1234567" })
      );

      expect(res.status).toBe(400);
    });

    it("Rate limit exceeded → 429", async () => {
      mockRateLimit.mockResolvedValue({ success: false });

      const res = await registerPOST(makeReq(url, validBody));

      expect(res.status).toBe(429);
    });

    it("إيميل مكرر → 409", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue({
        id: "existing",
        email: "ahmed@test.com",
      });

      const res = await registerPOST(makeReq(url, validBody));

      expect(res.status).toBe(409);
    });

    it("تسجيل ناجح → Set-Cookie + redirect + status = PENDING_META", async () => {
      mockPrisma.developerUser.findUnique.mockResolvedValue(null);
      mockBcryptHash.mockResolvedValue("hashed-password");
      mockPrisma.developerUser.create.mockResolvedValue({
        id: "dev-new",
        firstName: "Ahmed",
        lastName: "Ali",
        email: "ahmed@test.com",
        status: "PENDING_META",
      });

      const res = await registerPOST(makeReq(url, validBody));

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.redirect).toBe("/developers/portal");
      expect(res.headers.get("set-cookie")).toContain("dev-session");

      // التحقق إن الباسورد مش plain
      expect(mockPrisma.developerUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: "hashed-password",
          status: "PENDING_META",
        }),
      });
    });
  });
});
