import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  developerUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockSignDevToken = vi.hoisted(() => vi.fn());
const mockBuildDevSessionCookie = vi.hoisted(() => vi.fn());
const mockBcryptCompare = vi.hoisted(() => vi.fn());
const mockBcryptHash = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({
  getDevSessionFromRequest: mockGetDevSession,
  signDevToken: mockSignDevToken,
  buildDevSessionCookie: mockBuildDevSessionCookie,
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: any[]) => mockBcryptCompare(...args),
    hash: (...args: any[]) => mockBcryptHash(...args),
  },
}));

import { PUT } from "@/app/api/developers/settings/route";
import { NextRequest } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/developers/settings", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Developers Settings API — PUT /api/developers/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignDevToken.mockResolvedValue("new-token");
    mockBuildDevSessionCookie.mockReturnValue("dev-session=new-token; HttpOnly; Path=/");
  });

  it("بدون session → 401", async () => {
    mockGetDevSession.mockResolvedValue(null);

    const res = await PUT(makeReq({ firstName: "A", lastName: "B" }));

    expect(res.status).toBe(401);
  });

  it("firstName فاضي → 400", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });

    const res = await PUT(makeReq({ firstName: "", lastName: "Ali" }));

    expect(res.status).toBe(400);
  });

  it("lastName فاضي → 400", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });

    const res = await PUT(makeReq({ firstName: "Ahmed", lastName: "" }));

    expect(res.status).toBe(400);
  });

  it("حساب مش موجود → 404", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerUser.findUnique.mockResolvedValue(null);

    const res = await PUT(
      makeReq({ firstName: "Ahmed", lastName: "Ali" })
    );

    expect(res.status).toBe(404);
  });

  it("تحديث الاسم بنجاح → success + Set-Cookie جديد", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerUser.findUnique.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      password: "hashed",
      firstName: "Old",
      lastName: "Name",
    });
    mockPrisma.developerUser.update.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      firstName: "Ahmed",
      lastName: "Ali",
      status: "ACTIVE",
    });

    const res = await PUT(
      makeReq({ firstName: "Ahmed", lastName: "Ali" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(res.headers.get("set-cookie")).toContain("dev-session");

    // لازم يحدث الاسم بس (بدون باسورد)
    expect(mockPrisma.developerUser.update).toHaveBeenCalledWith({
      where: { id: "dev-1" },
      data: {
        firstName: "Ahmed",
        lastName: "Ali",
      },
    });
  });

  it("تغيير باسورد بكلمة سر حالية غلط → 400", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerUser.findUnique.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      password: "hashed-old",
    });
    mockBcryptCompare.mockResolvedValue(false);

    const res = await PUT(
      makeReq({
        firstName: "Ahmed",
        lastName: "Ali",
        currentPassword: "wrong-password",
        newPassword: "newSecurePass123",
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("باسورد جديد أقل من 8 أحرف → 400", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerUser.findUnique.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      password: "hashed-old",
    });
    mockBcryptCompare.mockResolvedValue(true);

    const res = await PUT(
      makeReq({
        firstName: "Ahmed",
        lastName: "Ali",
        currentPassword: "oldPassword",
        newPassword: "short",
      })
    );

    expect(res.status).toBe(400);
  });

  it("تغيير باسورد ناجح → بيعمل hash للباسورد الجديد", async () => {
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockPrisma.developerUser.findUnique.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      password: "hashed-old",
      firstName: "Ahmed",
      lastName: "Ali",
    });
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue("hashed-new-password");
    mockPrisma.developerUser.update.mockResolvedValue({
      id: "dev-1",
      email: "dev@test.com",
      firstName: "Ahmed",
      lastName: "Ali",
      status: "ACTIVE",
    });

    const res = await PUT(
      makeReq({
        firstName: "Ahmed",
        lastName: "Ali",
        currentPassword: "oldCorrectPassword",
        newPassword: "newSecurePass123",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // التحقق إن الباسورد الجديد اتعمله hash
    expect(mockPrisma.developerUser.update).toHaveBeenCalledWith({
      where: { id: "dev-1" },
      data: expect.objectContaining({
        password: "hashed-new-password",
      }),
    });
  });
});
