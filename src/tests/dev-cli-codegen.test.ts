import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

const mockPrisma = vi.hoisted(() => ({
  developerCliSession: {
    findUnique: vi.fn(),
    update: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  getIP: () => "1.2.3.4",
}));

import { POST } from "@/app/api/developers/cli/codegen/route";
import { NextRequest } from "next/server";

function authedReq(body: object): NextRequest {
  return new NextRequest("http://localhost/api/developers/cli/codegen", {
    method: "POST",
    headers: { authorization: "Bearer cli-token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ACTIVE_ROW = {
  id: "sess-1",
  developerId: "dev-1",
  deviceName: "laptop",
  expiresAt: new Date(Date.now() + 3600_000),
  revokedAt: null,
  developer: { status: "ACTIVE" },
};

describe("POST /api/developers/cli/codegen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    mockPrisma.developerCliSession.findUnique.mockResolvedValue({ ...ACTIVE_ROW });
  });

  it("generates code from the shared contract (single source of truth)", async () => {
    const res = await POST(
      authedReq({ language: "typescript", framework: "next", operation: "send", templateId: "tmpl_1" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.endpoint).toBe("/api/developers/otp/send");
    expect(data.code).toContain("tmpl_1");
    expect(data.code).toContain("WANI_API_KEY");
    expect(JSON.stringify(data)).not.toMatch(/wani_live_/);
  });

  it("accepts the Node init send-verify operation and uses the SDK methods", async () => {
    const res = await POST(
      authedReq({ language: "javascript", framework: "node", operation: "send-verify", templateId: "tmpl_otp" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operation).toBe("send-verify");
    expect(data.endpoint).toBe("/api/developers/otp/send");
    expect(data.code).toContain("getWani().otp.send");
    expect(data.code).toContain("getWani().otp.verify");
    expect(data.code).not.toContain("Unsupported operation");
  });

  it("rejects unknown framework for the language", async () => {
    const res = await POST(authedReq({ language: "python", framework: "next", operation: "send" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(typeof data.code).toBe("string");
  });

  it("rejects unknown language and operation", async () => {
    const badLang = await POST(authedReq({ language: "ruby", framework: "x", operation: "send" }));
    expect(badLang.status).toBe(400);
    const badOp = await POST(authedReq({ language: "python", framework: "django", operation: "blast" }));
    expect(badOp.status).toBe(400);
  });

  it("requires a CLI session", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/developers/cli/codegen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", framework: "django", operation: "send" }),
      })
    );
    expect(res.status).toBe(401);
  });
});
