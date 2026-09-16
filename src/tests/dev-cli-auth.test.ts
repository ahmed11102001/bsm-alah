import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DEV_JWT_SECRET = "super-secret-key-12345";
});

// ─── In-memory fake Prisma (faithful atomicity: updateMany returns count) ───
interface FakeAuth {
  id: string;
  deviceCodeHash: string;
  userCodeHash: string;
  browserTicketHash: string | null;
  browserTicketExpiresAt: Date | null;
  developerId: string | null;
  deviceName: string | null;
  status: string;
  approvedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

interface FakeSession {
  id: string;
  developerId: string;
  tokenHash: string;
  tokenPrefix: string;
  deviceName: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

const store = vi.hoisted(() => ({
  auths: new Map<string, FakeAuth>(),
  sessions: new Map<string, FakeSession>(),
  userStatus: "ACTIVE",
  seq: 0,
}));

function applySelect<T extends object>(row: T, select: Record<string, boolean> | undefined): any {
  if (!select) return { ...row };
  const out: any = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) out[k] = (row as any)[k];
    else if (v && typeof v === "object") out[k] = (row as any)[k]; // nested select passthrough
  }
  return out;
}

function matchAuth(a: FakeAuth, where: any): boolean {
  if (where.userCodeHash && a.userCodeHash !== where.userCodeHash) return false;
  if (where.deviceCodeHash && a.deviceCodeHash !== where.deviceCodeHash) return false;
  if (where.browserTicketHash && a.browserTicketHash !== where.browserTicketHash) return false;
  if (where.id && a.id !== where.id) return false;
  if (where.status && a.status !== where.status) return false;
  if (where.expiresAt?.gt && !(a.expiresAt.getTime() > where.expiresAt.gt.getTime())) return false;
  if (where.browserTicketExpiresAt?.gt) {
    if (!a.browserTicketExpiresAt) return false;
    if (!(a.browserTicketExpiresAt.getTime() > where.browserTicketExpiresAt.gt.getTime())) return false;
  }
  return true;
}

function matchSession(s: FakeSession, where: any): boolean {
  if (!where) return true;
  if (where.id && typeof where.id === "string" && s.id !== where.id) return false;
  if (where.id?.in && !where.id.in.includes(s.id)) return false;
  if (where.tokenHash && s.tokenHash !== where.tokenHash) return false;
  if (where.developerId && s.developerId !== where.developerId) return false;
  if (where.revokedAt === null && s.revokedAt !== null) return false;
  if (where.expiresAt?.gt && !(s.expiresAt.getTime() > where.expiresAt.gt.getTime())) return false;
  return true;
}

const mockPrisma = vi.hoisted(() => {
  const findAuth = (where: any, select?: any) => {
    for (const a of store.auths.values()) {
      if (where.userCodeHash && a.userCodeHash === where.userCodeHash) return applySelect(a, select);
      if (where.deviceCodeHash && a.deviceCodeHash === where.deviceCodeHash) return applySelect(a, select);
      if (where.browserTicketHash && a.browserTicketHash === where.browserTicketHash) return applySelect(a, select);
      if (where.id && a.id === where.id) return applySelect(a, select);
    }
    return null;
  };
  return {
    developerUser: {
      findUnique: vi.fn(async () => ({ status: store.userStatus })),
    },
    developerCliAuthorization: {
      create: vi.fn(async ({ data }: any) => {
        const row: FakeAuth = {
          id: `auth-${++store.seq}`,
          approvedAt: null,
          consumedAt: null,
          createdAt: new Date(),
          developerId: null,
          browserTicketHash: null,
          browserTicketExpiresAt: null,
          ...data,
        };
        store.auths.set(row.id, row);
        return { ...row };
      }),
      findUnique: vi.fn(async ({ where, select }: any) => findAuth(where, select)),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const a of store.auths.values()) {
          if (matchAuth(a, where)) {
            Object.assign(a, data);
            count++;
          }
        }
        return { count };
      }),
    },
    developerCliSession: {
      create: vi.fn(async ({ data }: any) => {
        const row: FakeSession = {
          id: `sess-${++store.seq}`,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          revokedAt: null,
          ...data,
        };
        store.sessions.set(row.id, row);
        return { ...row };
      }),
      findUnique: vi.fn(async ({ where, select }: any) => {
        for (const s of store.sessions.values()) {
          if (where.tokenHash && s.tokenHash === where.tokenHash) {
            const out = applySelect(s, select);
            if (select?.developer) out.developer = { status: store.userStatus };
            return out;
          }
          if (where.id && s.id === where.id) return applySelect(s, select);
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, orderBy, take, select }: any) => {
        let rows = [...store.sessions.values()].filter((s) => matchSession(s, where));
        if (orderBy?.createdAt === "asc" || orderBy?.lastUsedAt === "desc") {
          const key = orderBy.createdAt ? "createdAt" : "lastUsedAt";
          rows.sort((x, y) =>
            orderBy.createdAt === "asc"
              ? x[key].getTime() - y[key].getTime()
              : y[key].getTime() - x[key].getTime()
          );
        }
        if (take) rows = rows.slice(0, take);
        return rows.map((r) => applySelect(r, select));
      }),
      count: vi.fn(async ({ where }: any) => [...store.sessions.values()].filter((s) => matchSession(s, where)).length),
      update: vi.fn(async ({ where, data }: any) => {
        const s = store.sessions.get(where.id);
        if (s) Object.assign(s, data);
        return s;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const s of store.sessions.values()) {
          if (matchSession(s, where)) {
            Object.assign(s, data);
            count++;
          }
        }
        return { count };
      }),
    },
  };
});

const mockGetDevSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/dev-auth", () => ({ getDevSessionFromRequest: mockGetDevSession }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  getIP: () => "1.2.3.4",
}));

import { POST as deviceCodePOST } from "@/app/api/developers/cli/device/code/route";
import { POST as lookupPOST } from "@/app/api/developers/cli/authorize/lookup/route";
import { POST as approvePOST } from
"@/app/api/developers/cli/authorize/approve/route";
import { POST as lookupTicketPOST } from
"@/app/api/developers/cli/authorize/lookup-ticket/route";
import { POST as deviceTokenPOST } from "@/app/api/developers/cli/device/token/route";
import { GET as sessionsGET } from "@/app/api/developers/cli/sessions/route";
import { POST as revokePOST } from "@/app/api/developers/cli/sessions/revoke/route";
import { POST as loginPOST } from "@/app/api/developers/auth/login/route";
import { requireCliSession } from "@/lib/dev-cli-auth";
import { NextRequest } from "next/server";

const HOST = "developers.localhost";

function makeReq(
  path: string,
  method: string,
  body?: object,
  extraHeaders?: Record<string, string>
): NextRequest {
  const headers: Record<string, string> = { host: HOST, ...(extraHeaders ?? {}) };
  if (body) headers["Content-Type"] = "application/json";
  return new NextRequest(`http://${HOST}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const authed = (id = "dev-1") =>
  mockGetDevSession.mockResolvedValue({ id, email: `${id}@x.com`, name: "D", status: "ACTIVE" });

/** Full happy-path: device/code → approve → device/token. Returns all codes. */
async function fullFlow(deviceName = "Test Machine") {
  authed("dev-1");
  const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", { device_name: deviceName }));
  expect(codeRes.status).toBe(200);
  const { device_code, user_code } = await codeRes.json();

  const approveRes = await approvePOST(
    makeReq("/api/developers/cli/authorize/approve", "POST",
      { user_code, decision: "allow" },
      { origin: `http://${HOST}` })
  );
  expect(approveRes.status).toBe(200);

  const tokenRes = await deviceTokenPOST(
    makeReq("/api/developers/cli/device/token", "POST", { device_code })
  );
  expect(tokenRes.status).toBe(200);
  const { access_token } = await tokenRes.json();
  return { device_code, user_code, access_token };
}

describe("CLI device authorization (Portal side)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.auths.clear();
    store.sessions.clear();
    store.userStatus = "ACTIVE";
    store.seq = 0;
    vi.stubEnv("NODE_ENV", "production");
  });

  it("1. unauthenticated user cannot approve", async () => {
    mockGetDevSession.mockResolvedValue(null);
    const res = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST",
        { user_code: "ABCD-1234", decision: "allow" },
        { origin: `http://${HOST}` })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("AUTH_REQUIRED");
  });

  it("2. authenticated user can open an authorization request (masked, no secrets)", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(
      makeReq("/api/developers/cli/device/code", "POST", { device_name: "My Laptop" })
    );
    expect(codeRes.status).toBe(200);
    const { user_code, device_code } = await codeRes.json();
    expect(typeof device_code).toBe("string");
    expect(user_code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const lookup = await lookupPOST(
      makeReq("/api/developers/cli/authorize/lookup", "POST", { user_code })
    );
    expect(lookup.status).toBe(200);
    const data = await lookup.json();
    expect(data.status).toBe("PENDING");
    expect(data.device_name).toBe("My Laptop");
    expect(JSON.stringify(data)).not.toMatch(/tokenHash|deviceCodeHash|userCodeHash|password/i);
  });

  it("3. invalid state rejected", async () => {
    authed("dev-1");
    const lookup = await lookupPOST(
      makeReq("/api/developers/cli/authorize/lookup", "POST", { user_code: "ZZZZ-9999" })
    );
    expect(lookup.status).toBe(404);
    const data = await lookup.json();
    expect(data.code).toBe("AUTHORIZATION_INVALID");

    const token = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code: "nope" })
    );
    expect(token.status).toBe(404);
  });

  it("4. expired state rejected", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const { user_code, device_code } = await codeRes.json();
    // Force expiry in the past.
    for (const a of store.auths.values()) a.expiresAt = new Date(Date.now() - 1000);

    const lookup = await lookupPOST(
      makeReq("/api/developers/cli/authorize/lookup", "POST", { user_code })
    );
    expect(lookup.status).toBe(410);
    expect((await lookup.json()).code).toBe("AUTHORIZATION_EXPIRED");

    const token = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code })
    );
    expect(token.status).toBe(410);
  });

  it("5. approval is single-use (second approve fails)", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const { user_code } = await codeRes.json();
    const headers = { origin: `http://${HOST}` };

    const first = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST", { user_code, decision: "allow" }, headers)
    );
    expect(first.status).toBe(200);

    const second = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST", { user_code, decision: "allow" }, headers)
    );
    expect(second.status).toBe(409);
    expect((await second.json()).code).toBe("AUTHORIZATION_INVALID");
  });

  it("6. authorization cannot be reused (token poll twice → second fails)", async () => {
    const { device_code } = await fullFlow();
    const again = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code })
    );
    expect(again.status).toBe(400);
    expect((await again.json()).code).toBe("AUTHORIZATION_INVALID");
  });

  it("7. authorization belongs to the correct developer", async () => {
    const { access_token } = await fullFlow();

    // Another developer sees nothing and cannot revoke it.
    authed("dev-2");
    const list = await sessionsGET(makeReq("/api/developers/cli/sessions", "GET"));
    expect(list.status).toBe(200);
    expect((await list.json()).sessions).toEqual([]);

    const targetId = [...store.sessions.values()][0].id;
    const revoke = await revokePOST(
      makeReq("/api/developers/cli/sessions/revoke", "POST", { id: targetId }, { origin: `http://${HOST}` })
    );
    expect(revoke.status).toBe(404);

    // The owner's token still validates.
    const cli = await requireCliSession(
      new NextRequest("http://x/", { headers: { authorization: `Bearer ${access_token}` } })
    );
    expect(cli?.developerId).toBe("dev-1");
  });

  it("8. revoked CLI session cannot be used", async () => {
    const { access_token } = await fullFlow();
    const targetId = [...store.sessions.values()][0].id;

    authed("dev-1");
    const revoke = await revokePOST(
      makeReq("/api/developers/cli/sessions/revoke", "POST", { id: targetId }, { origin: `http://${HOST}` })
    );
    expect(revoke.status).toBe(200);

    const cli = await requireCliSession(
      new NextRequest("http://x/", { headers: { authorization: `Bearer ${access_token}` } })
    );
    expect(cli).toBeNull();
  });

  it("9. no password or API key appears in authorization responses", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const codeBody = await codeRes.json();
    const approveRes = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST",
        { user_code: codeBody.user_code, decision: "allow" }, { origin: `http://${HOST}` })
    );
    const tokenRes = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code: codeBody.device_code })
    );
    const tokenBody = await tokenRes.json();
    const lookupRes = await lookupPOST(
      makeReq("/api/developers/cli/authorize/lookup", "POST", { user_code: codeBody.user_code })
    );

    const all = JSON.stringify([codeBody, await approveRes.json(), tokenBody, await lookupRes.json()]);
    expect(all).not.toMatch(/password/i);
    expect(all).not.toMatch(/wani_live_/);
    expect(all).not.toMatch(/x-api-key/i);
    expect(all).not.toMatch(/tokenHash|deviceCodeHash|userCodeHash/);
    // The one credential delivered once, to its holder only:
    expect(typeof tokenBody.access_token).toBe("string");
  });

  it("10. CSRF protection: cross-origin approve rejected", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const { user_code } = await codeRes.json();

    const evil = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST",
        { user_code, decision: "allow" }, { origin: "https://evil.example" })
    );
    expect(evil.status).toBe(403);
    expect((await evil.json()).code).toBe("FORBIDDEN");

    // Same-origin works.
    const legit = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST",
        { user_code, decision: "allow" }, { origin: `http://${HOST}` })
    );
    expect(legit.status).toBe(200);
  });

  it("11. suspended developer cannot authorize a new CLI session", async () => {
    authed("dev-9");
    store.userStatus = "SUSPENDED";
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const { user_code, device_code } = await codeRes.json();

    const approve = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST",
        { user_code, decision: "allow" }, { origin: `http://${HOST}` })
    );
    expect(approve.status).toBe(403);
    expect((await approve.json()).code).toBe("ACCOUNT_SUSPENDED");

    // And even a pre-suspension approval cannot mint a token afterwards.
    for (const a of store.auths.values()) {
      a.status = "APPROVED";
      a.developerId = "dev-9";
    }
    const token = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code })
    );
    expect(token.status).toBe(403);
  });

  it("12. existing web login behavior unchanged", async () => {
    const res = await loginPOST(
      makeReq("/api/developers/auth/login", "POST", { email: "a@x.com" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("INVALID_REQUEST");
  });
});

function ticketFromUri(verificationUri: string): string {
  const query = verificationUri.split("?", 2)[1] ?? "";
  const ticket = new URLSearchParams(query).get("ticket") ?? "";
  expect(ticket).toMatch(/^[0-9a-f]{64}$/);
  return ticket;
}

describe("CLI seamless ticket flow (?ticket=�)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.auths.clear();
    store.sessions.clear();
    store.userStatus = "ACTIVE";
    store.seq = 0;
    vi.stubEnv("NODE_ENV", "production");
  });

  it("device/code embeds a ticket; lookup-ticket resolves straight to review", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", { device_name: "Term" }));
    expect(codeRes.status).toBe(200);
    const started = await codeRes.json();
    expect(started.verification_uri).toContain("?ticket=");
    const ticket = ticketFromUri(started.verification_uri);

    const lookup = await lookupTicketPOST(
      makeReq("/api/developers/cli/authorize/lookup-ticket", "POST", { ticket })
    );
    expect(lookup.status).toBe(200);
    const data = await lookup.json();
    expect(data.status).toBe("PENDING");
    expect(data.device_name).toBe("Term");
    expect(JSON.stringify(data)).not.toMatch(/tokenHash|deviceCodeHash|userCodeHash|ticketHash|password/i);
  });

  it("approve via ticket completes the flow; ticket is single-use", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const started = await codeRes.json();
    const ticket = ticketFromUri(started.verification_uri);
    const headers = { origin: `http://${HOST}` };

    const approve = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST", { ticket, decision: "allow" }, headers)
    );
    expect(approve.status).toBe(200);

    // Same ticket again ? gone (killed on transition).
    const reuse = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST", { ticket, decision: "allow" }, headers)
    );
    expect(reuse.status).toBe(409);

    // device_code still mints exactly one session.
    const first = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code: started.device_code })
    );
    expect(first.status).toBe(200);
    const second = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code: started.device_code })
    );
    expect(second.status).toBe(400);
  });

  it("manual user_code flow still works after the ticket change", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const { user_code, device_code } = await codeRes.json();
    const headers = { origin: `http://${HOST}` };

    const approve = await approvePOST(
      makeReq("/api/developers/cli/authorize/approve", "POST", { user_code, decision: "allow" }, headers)
    );
    expect(approve.status).toBe(200);

    const token = await deviceTokenPOST(
      makeReq("/api/developers/cli/device/token", "POST", { device_code })
    );
    expect(token.status).toBe(200);
    expect(typeof (await token.json()).access_token).toBe("string");
  });

  it("expired ticket rejected; malformed ticket rejected", async () => {
    authed("dev-1");
    const codeRes = await deviceCodePOST(makeReq("/api/developers/cli/device/code", "POST", {}));
    const ticket = ticketFromUri((await codeRes.json()).verification_uri);
    for (const a of store.auths.values()) {
      a.browserTicketExpiresAt = new Date(Date.now() - 1000);
    }

    const expired = await lookupTicketPOST(
      makeReq("/api/developers/cli/authorize/lookup-ticket", "POST", { ticket })
    );
    expect(expired.status).toBe(410);

    const malformed = await lookupTicketPOST(
      makeReq("/api/developers/cli/authorize/lookup-ticket", "POST", { ticket: "not-hex" })
    );
    expect(malformed.status).toBe(400);

    const unknown = await lookupTicketPOST(
      makeReq("/api/developers/cli/authorize/lookup-ticket", "POST", { ticket: "a".repeat(64) })
    );
    expect(unknown.status).toBe(404);
  });
});
