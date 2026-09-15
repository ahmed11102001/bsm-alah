import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  developerApiKey: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { GET } from "@/app/api/developers/otp/key-info/route";
import { NextRequest } from "next/server";
import { createHash } from "crypto";

function makeReq(apiKey: string | null): NextRequest {
  const init: any = { method: "GET" };
  if (apiKey !== null) init.headers = { "x-api-key": apiKey };
  return new NextRequest("http://localhost/api/developers/otp/key-info", init);
}

describe("Developers OTP Key Info — /api/developers/otp/key-info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("missing key → 401", async () => {
    const res = await GET(makeReq(null));
    expect(res.status).toBe(401);
  });

  it("unknown/revoked key → 401 INVALID_API_KEY", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue(null);
    const res = await GET(makeReq("wani_live_nope"));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.code).toBe("INVALID_API_KEY");
  });

  it("valid key → projectId + projectName (sha256 lookup, no secrets leaked)", async () => {
    mockPrisma.developerApiKey.findUnique.mockResolvedValue({
      status: "ACTIVE",
      project: { id: "proj-A", name: "Shop" },
    });
    const res = await GET(makeReq("wani_live_abc"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, projectId: "proj-A", projectName: "Shop" });
    expect(mockPrisma.developerApiKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { keyHash: createHash("sha256").update("wani_live_abc").digest("hex") },
      })
    );
  });
});
