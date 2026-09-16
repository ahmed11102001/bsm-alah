import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerUser: { findUnique: vi.fn() },
  developerApiKey: { findFirst: vi.fn() },
}));

const mockGetDevSession = vi.hoisted(() => vi.fn());
const mockGetProject = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));
const mockBcryptCompare = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({ getDevSessionFromRequest: mockGetDevSession }));
vi.mock("@/lib/dev-project-auth", () => ({
  getProjectForOwnerOrDeveloper: mockGetProject,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
  getIP: () => "1.2.3.4",
}));
vi.mock("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}));

process.env.ENCRYPTION_KEY = "a".repeat(64);

import { POST } from "@/app/api/developers/projects/[id]/api-keys/reveal/route";
import { encryptToken } from "@/lib/crypto";
import { NextRequest } from "next/server";

function makeReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/developers/projects/p1/api-keys/reveal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const makeParams = () => Promise.resolve({ id: "p1" });

describe("API Key reveal — password-gated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockGetDevSession.mockResolvedValue({ id: "dev-1" });
    mockGetProject.mockResolvedValue({ id: "p1" });
  });

  it("باسورد صحيح → يرجع المفتاح الكامل", async () => {
    const fullKey = "wani_live_abc123_secret";
    mockPrisma.developerUser.findUnique.mockResolvedValue({ password: "hashed" });
    mockBcryptCompare.mockResolvedValue(true);
    mockPrisma.developerApiKey.findFirst.mockResolvedValue({ keyEncrypted: encryptToken(fullKey) });

    const res = await POST(makeReq({ keyId: "k1", password: "correct" }), { params: makeParams() });
    expect(res.status).toBe(200);
    expect((await res.json()).fullKey).toBe(fullKey);
  });

  it("باسورد غلط → 401 ولا يكشف المفتاح", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue({ password: "hashed" });
    mockBcryptCompare.mockResolvedValue(false);

    const res = await POST(makeReq({ keyId: "k1", password: "wrong" }), { params: makeParams() });
    expect(res.status).toBe(401);
    expect(mockPrisma.developerApiKey.findFirst).not.toHaveBeenCalled();
  });

  it("مفتاح قديم بدون نسخة مشفرة → 400", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue({ password: "hashed" });
    mockBcryptCompare.mockResolvedValue(true);
    mockPrisma.developerApiKey.findFirst.mockResolvedValue({ keyEncrypted: null });

    const res = await POST(makeReq({ keyId: "k1", password: "correct" }), { params: makeParams() });
    expect(res.status).toBe(400);
  });

  it("مشروع مش بتاعه → 404", async () => {
    mockGetProject.mockResolvedValue(null);
    const res = await POST(makeReq({ keyId: "k1", password: "x" }), { params: makeParams() });
    expect(res.status).toBe(404);
  });
});
