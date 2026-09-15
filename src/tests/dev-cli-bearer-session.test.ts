import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

const VALID_TOKEN = "raw-cli-token-abc123";
const VALID_HASH = "hash-of-valid-token";

const mockPrisma = vi.hoisted(() => ({
  developerUser: { findUnique: vi.fn() },
  developerCliSession: {
    findUnique: vi.fn(),
    update: vi.fn(() => Promise.resolve({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-cli-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dev-cli-auth")>();
  return {
    ...actual,
    // Deterministic hash mapping for the test token (real sha256 otherwise).
    resolveCliSessionToken: vi.fn(async (raw: string) => {
      if (raw !== VALID_TOKEN) return null;
      return mockPrisma.developerCliSession.findUnique({
        where: { tokenHash: VALID_HASH },
      }).then((s: any) => {
        if (!s || s.revokedAt) return null;
        if (s.expiresAt.getTime() <= Date.now()) return null;
        if (s.developer?.status === "SUSPENDED") return null;
        return { id: s.id, developerId: s.developerId, deviceName: s.deviceName };
      });
    }),
  };
});

import { getDevSessionFromRequest, signDevToken, clearDevSessionStatusCache } from "@/lib/dev-auth";
import { POST as revokeCurrentPOST } from "@/app/api/developers/cli/sessions/revoke-current/route";
import { NextRequest } from "next/server";

function reqWith(headers: Record<string, string>, cookieValue?: string): NextRequest {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    cookies: { get: (name: string) => (name === "dev-session" && cookieValue ? { value: cookieValue } : undefined) },
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

const ACTIVE_SESSION_ROW = () => ({
  id: "sess-1",
  developerId: "dev-1",
  deviceName: "laptop",
  expiresAt: new Date(Date.now() + 3600_000),
  revokedAt: null,
  developer: { status: "ACTIVE" },
});

const IDENTITY = {
  email: "dev@x.com",
  firstName: "Dev",
  lastName: "One",
  status: "ACTIVE",
};

describe("CLI Bearer acceptance in getDevSessionFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDevSessionStatusCache();
    vi.stubEnv("NODE_ENV", "production");
  });

  it("valid Bearer → live DevSession with identity (no cookie needed)", async () => {
    mockPrisma.developerCliSession.findUnique.mockResolvedValue(ACTIVE_SESSION_ROW());
    mockPrisma.developerUser.findUnique.mockResolvedValue(IDENTITY);

    const session = await getDevSessionFromRequest(
      reqWith({ authorization: `Bearer ${VALID_TOKEN}` })
    );

    expect(session).not.toBeNull();
    expect(session?.id).toBe("dev-1");
    expect(session?.email).toBe("dev@x.com");
    expect(session?.status).toBe("ACTIVE");
  });

  it("cookie path unchanged and preferred (Bearer ignored when cookie valid)", async () => {
    mockPrisma.developerUser.findUnique.mockResolvedValue({ status: "ACTIVE" });
    const jwt = await signDevToken({ id: "web-1", email: "w@x.com", name: "W", status: "ACTIVE" });

    const session = await getDevSessionFromRequest(
      reqWith({ authorization: `Bearer ${VALID_TOKEN}` }, jwt)
    );

    expect(session?.id).toBe("web-1");
    expect(mockPrisma.developerCliSession.findUnique).not.toHaveBeenCalled();
  });

  it("revoked / unknown / expired / suspended Bearer → null", async () => {
    // Unknown token.
    mockPrisma.developerCliSession.findUnique.mockResolvedValue(null);
    expect(
      await getDevSessionFromRequest(reqWith({ authorization: "Bearer nope" }))
    ).toBeNull();

    // Revoked.
    mockPrisma.developerCliSession.findUnique.mockResolvedValue({ ...ACTIVE_SESSION_ROW(), revokedAt: new Date() });
    mockPrisma.developerUser.findUnique.mockResolvedValue(IDENTITY);
    expect(
      await getDevSessionFromRequest(reqWith({ authorization: `Bearer ${VALID_TOKEN}` }))
    ).toBeNull();

    // Expired.
    mockPrisma.developerCliSession.findUnique.mockResolvedValue({
      ...ACTIVE_SESSION_ROW(),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(
      await getDevSessionFromRequest(reqWith({ authorization: `Bearer ${VALID_TOKEN}` }))
    ).toBeNull();

    // Suspended developer.
    mockPrisma.developerCliSession.findUnique.mockResolvedValue({
      ...ACTIVE_SESSION_ROW(),
      developer: { status: "SUSPENDED" },
    });
    mockPrisma.developerUser.findUnique.mockResolvedValue({ ...IDENTITY, status: "SUSPENDED" });
    expect(
      await getDevSessionFromRequest(reqWith({ authorization: `Bearer ${VALID_TOKEN}` }))
    ).toBeNull();
  });

  it("no credentials at all → null", async () => {
    expect(await getDevSessionFromRequest(reqWith({}))).toBeNull();
    expect(mockPrisma.developerCliSession.findUnique).not.toHaveBeenCalled();
  });
});

describe("POST /api/developers/cli/sessions/revoke-current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  function bearerReq(token: string | null): NextRequest {
    return new NextRequest("http://localhost/api/developers/cli/sessions/revoke-current", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  }

  it("revokes the presenting session; second call is unauthorized", async () => {
    let revoked = false;
    mockPrisma.developerCliSession.findUnique.mockImplementation(async () =>
      revoked ? { ...ACTIVE_SESSION_ROW(), revokedAt: new Date() } : ACTIVE_SESSION_ROW()
    );
    mockPrisma.developerCliSession.updateMany.mockImplementation(async () => {
      revoked = true;
      return { count: 1 };
    });

    const first = await revokeCurrentPOST(bearerReq(VALID_TOKEN));
    expect(first.status).toBe(200);
    expect((await first.json()).ok).toBe(true);
    expect(mockPrisma.developerCliSession.updateMany).toHaveBeenCalledWith({
      where: { id: "sess-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    const second = await revokeCurrentPOST(bearerReq(VALID_TOKEN));
    expect(second.status).toBe(401);
  });

  it("no token → 401", async () => {
    const res = await revokeCurrentPOST(bearerReq(null));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("INVALID_SESSION");
  });
});
