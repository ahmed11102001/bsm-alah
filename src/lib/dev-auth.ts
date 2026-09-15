import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { extractBearerToken, resolveCliSessionToken } from "@/lib/dev-cli-auth";

const secretStr = process.env.DEV_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secretStr) {
  throw new Error(
    "[dev-auth] DEV_JWT_SECRET أو NEXTAUTH_SECRET مطلوب — مش تستخدم fallback غير آمن في Production"
  );
}
const SECRET = new TextEncoder().encode(secretStr);

const COOKIE_NAME = "dev-session";
const MAX_AGE = 30 * 24 * 60 * 60;

export interface DevSession {
  id: string;
  email: string;
  name: string | null;
  status: string;
}

export async function signDevToken(payload: DevSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyDevToken(token: string): Promise<DevSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as DevSession;
  } catch {
    return null;
  }
}

// ─── Central SUSPENDED enforcement ──────────────────────────────────────────
// JWTs live up to 30 days and embed `status` at login time, so a token issued
// while ACTIVE stays cryptographically valid after a SUSPEND. Every session
// route in /api/developers/** resolves identity through getDevSession() /
// getDevSessionFromRequest(), so the live status check lives HERE — one place,
// not one check per route.
//
// Performance: a short-lived (60s) in-memory status cache bounds the extra DB
// load to ~1 query/min/active-user/instance. Worst case, a freshly suspended
// account keeps access for at most 60s on a warm instance — not 30 days.
// On DB failure we fall back to the JWT claim (previous behavior) and log,
// so a DB blip doesn't lock out every developer; the trade-off is documented.

const STATUS_TTL_MS = 60_000;
const STATUS_CACHE_MAX = 5000;
const statusCache = new Map<string, { status: string; expiresAt: number }>();

export function clearDevSessionStatusCache(): void {
  statusCache.clear();
}

async function getLiveAccountStatus(userId: string, jwtStatus: string): Promise<string> {
  const now = Date.now();
  const cached = statusCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.status;
  try {
    const user = await prisma.developerUser.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    const status = user?.status ?? "DELETED";
    statusCache.set(userId, { status, expiresAt: now + STATUS_TTL_MS });
    if (statusCache.size > STATUS_CACHE_MAX) {
      const oldest = statusCache.keys().next().value;
      if (oldest) statusCache.delete(oldest);
    }
    return status;
  } catch (err) {
    console.error("[dev-auth] live status lookup failed — trusting JWT claim:", err);
    return jwtStatus;
  }
}

async function withLiveStatus(session: DevSession | null): Promise<DevSession | null> {
  if (!session) return null;
  const live = await getLiveAccountStatus(session.id, session.status);
  if (live === "SUSPENDED" || live === "DELETED") return null;
  return live === session.status ? session : { ...session, status: live };
}

export async function getDevSession(): Promise<DevSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return withLiveStatus(await verifyDevToken(token));
}

export async function getDevSessionFromRequest(req: NextRequest): Promise<DevSession | null> {
  // Web path first — cookie behavior is byte-for-byte unchanged.
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) return withLiveStatus(await verifyDevToken(token));
  // CLI path: `Authorization: Bearer <cli-session-token>` (device flow).
  // Bearer is a non-ambient credential (browsers never attach it cross-site),
  // so accepting it here introduces no CSRF exposure, and every downstream
  // route keeps working unchanged with a live-checked DevSession.
  return devSessionFromCliBearer(req);
}

async function devSessionFromCliBearer(req: NextRequest): Promise<DevSession | null> {
  const raw = extractBearerToken(req);
  if (!raw) return null;
  const cli = await resolveCliSessionToken(raw);
  if (!cli) return null;
  const user = await prisma.developerUser.findUnique({
    where: { id: cli.developerId },
    select: { email: true, firstName: true, lastName: true, status: true },
  });
  // resolveCliSessionToken already rejected revoked/expired/suspended — this
  // is a second cheap identity gate, never a fallback that widens access.
  if (!user || user.status === "SUSPENDED") return null;
  return {
    id: cli.developerId,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    status: user.status,
  };
}

export function buildDevSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function buildDevLogoutCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}