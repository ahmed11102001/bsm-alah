import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  default: { developerUser: { findUnique: mockFindUnique } },
}));

import {
  signDevToken,
  getDevSessionFromRequest,
  clearDevSessionStatusCache,
} from "@/lib/dev-auth";
import { NextRequest } from "next/server";

function reqWithToken(token: string | undefined): NextRequest {
  return {
    cookies: {
      get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    },
  } as unknown as NextRequest;
}

describe("SUSPENDED developer session enforcement (central, in dev-auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    clearDevSessionStatusCache();
  });

  it("1. ACTIVE account + valid session → allowed (no regression)", async () => {
    mockFindUnique.mockResolvedValue({ status: "ACTIVE" });
    const token = await signDevToken({
      id: "dev-1",
      email: "a@x.com",
      name: "A",
      status: "ACTIVE",
    });

    const session = await getDevSessionFromRequest(reqWithToken(token));

    expect(session).not.toBeNull();
    expect(session?.id).toBe("dev-1");
  });

  it("2. SUSPENDED account + session issued BEFORE suspend → rejected", async () => {
    // Token was minted while ACTIVE (stale JWT claim)…
    const token = await signDevToken({
      id: "dev-2",
      email: "b@x.com",
      name: "B",
      status: "ACTIVE",
    });
    // …but the DB now says SUSPENDED.
    mockFindUnique.mockResolvedValue({ status: "SUSPENDED" });

    const session = await getDevSessionFromRequest(reqWithToken(token));

    expect(session).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "dev-2" },
      select: { status: true },
    });
  });

  it("3. SUSPENDED account + fresh session → rejected", async () => {
    mockFindUnique.mockResolvedValue({ status: "SUSPENDED" });
    const token = await signDevToken({
      id: "dev-3",
      email: "c@x.com",
      name: "C",
      status: "SUSPENDED",
    });

    const session = await getDevSessionFromRequest(reqWithToken(token));

    expect(session).toBeNull();
  });

  it("4. Invalid/expired JWT → rejected", async () => {
    mockFindUnique.mockResolvedValue({ status: "ACTIVE" });

    expect(await getDevSessionFromRequest(reqWithToken("not-a-jwt"))).toBeNull();
    expect(await getDevSessionFromRequest(reqWithToken(undefined))).toBeNull();
    // DB must not even be consulted for an unreadable token.
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("5. Deleted account (no DB row) → rejected", async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = await signDevToken({
      id: "dev-gone",
      email: "g@x.com",
      name: "G",
      status: "ACTIVE",
    });

    expect(await getDevSessionFromRequest(reqWithToken(token))).toBeNull();
  });

  it("live DB status wins over a stale JWT claim (PENDING_META → ACTIVE)", async () => {
    mockFindUnique.mockResolvedValue({ status: "ACTIVE" });
    const token = await signDevToken({
      id: "dev-4",
      email: "d@x.com",
      name: "D",
      status: "PENDING_META",
    });

    const session = await getDevSessionFromRequest(reqWithToken(token));

    expect(session?.status).toBe("ACTIVE");
  });

  it("DB outage → falls back to JWT claim (availability trade-off, logged)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindUnique.mockRejectedValue(new Error("db down"));
    const token = await signDevToken({
      id: "dev-5",
      email: "e@x.com",
      name: "E",
      status: "ACTIVE",
    });

    const session = await getDevSessionFromRequest(reqWithToken(token));

    // Previous behavior preserved when the DB is unreachable.
    expect(session?.id).toBe("dev-5");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
