import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";

// ─── Wani CLI authorization (device flow, Portal side) ──────────────────────
//
// Phase 1 is Portal-only: the CLI itself is untouched. This module holds the
// shared building blocks the routes below use:
//
//   POST /api/developers/cli/device/code       (public, rate-limited)
//   POST /api/developers/cli/authorize/lookup  (web session)
//   POST /api/developers/cli/authorize/approve (web session + same-origin)
//   POST /api/developers/cli/device/token      (public, rate-limited)
//   GET  /api/developers/cli/sessions          (web session)
//   POST /api/developers/cli/sessions/revoke   (web session + same-origin)
//   POST /api/developers/cli/sessions/revoke-all (web session + same-origin)
//   GET  /api/developers/cli/whoami            (CLI Bearer session)
//
// Security properties (all enforced, all tested):
// - device_code / session token: 256-bit CSPRNG, sha256 hash stored,
//   raw value returned exactly once to its holder, never persisted.
// - user_code: short human-typable code, sha256 hash stored, 10-min expiry.
// - Single-use: PENDING→APPROVED|DENIED→CONSUMED via atomic conditional
//   updateMany (count===0 ⇒ already used / invalid).
// - Authorization binds developerId only at browser approval time — a stolen
//   device_code alone grants nothing (anti fixation).
// - No secrets in URLs: codes/tokens travel in POST JSON bodies only.
// - No passwords, API keys, or dev-session cookies ever leave the Portal.
// - CSRF: cookie-authenticated writes additionally require a same-origin
//   Origin/Referer (this repo has no synchronizer-token system; SameSite=Lax
//   alone is not enough for state-changing API routes).
// - Suspended developers cannot approve or mint CLI sessions.

export const CLI_AUTH_REQUEST_TTL_SECS = 10 * 60;
export const CLI_SESSION_TTL_SECS = 90 * 24 * 60 * 60;
export const CLI_MAX_ACTIVE_SESSIONS = 10;

export const CLI_AUTH_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DENIED: "DENIED",
  CONSUMED: "CONSUMED",
} as const;

// Unambiguous charset (no 0/O, 1/I/l) for the human-typed user code.
const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sha256hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function randomFromAlphabet(length: number, alphabet: string): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** 256-bit device secret. Returned once to the CLI; only its hash is stored. */
export function newDeviceCode(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: sha256hex(raw) };
}

/** Short human-typable code, formatted XXXX-XXXX. */
export function newUserCode(): { raw: string; hash: string; display: string } {
  const compact = randomFromAlphabet(8, USER_CODE_ALPHABET);
  const display = `${compact.slice(0, 4)}-${compact.slice(4)}`;
  // Lookup accepts both "XXXX-XXXX" and "XXXXXXXX" — normalize before hashing.
  return { raw: compact, hash: sha256hex(compact), display };
}

export function normalizeUserCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const compact = input.trim().toUpperCase().replace(/-/g, "");
  if (compact.length !== 8) return null;
  if (!/^[A-Z2-9]{8}$/.test(compact)) return null;
  return compact;
}

/** Long-lived CLI session token. Same prefix convention as API keys. */
export function newCliSessionToken(): { raw: string; hash: string; prefix: string } {
  const prefix = "wani_cli_" + randomBytes(4).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const raw = `${prefix}_${secret}`;
  return { raw, hash: sha256hex(raw), prefix };
}

// ─── CSRF: same-origin check for cookie-authenticated writes ────────────────
// The developers portal has no synchronizer-token system; state-changing
// session routes additionally verify Origin (preferred) or Referer matches
// the request host. Safe methods / missing-both (curl, server-to-server)
// fall back to SameSite=Lax cookie semantics — callers decide: this helper
// returns false when origin proof is absent OR mismatched.
export function isSameOriginRequest(req: Request): boolean {
  const host = hostOf(req);
  if (!host) return false;
  const origin = req.headers.get("origin");
  if (origin) return hostOfString(origin) === host;
  const referer = req.headers.get("referer");
  if (referer) return hostOfString(referer) === host;
  return false;
}

function hostOf(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-host");
  const h = forwarded || req.headers.get("host") || "";
  return h.split(":")[0].toLowerCase() || null;
}

function hostOfString(url: string): string | null {
  try {
    return new URL(url).host.split(":")[0].toLowerCase();
  } catch {
    return null;
  }
}

// ─── CLI Bearer session validation (Phase 2 consumer + tests) ──────────────
export interface CliSessionRecord {
  id: string;
  developerId: string;
  deviceName: string | null;
}

export async function requireCliSession(req: Request): Promise<CliSessionRecord | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  const tokenHash = sha256hex(match[1]);

  const session = await prisma.developerCliSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      developerId: true,
      deviceName: true,
      expiresAt: true,
      revokedAt: true,
      developer: { select: { status: true } },
    },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.developer?.status === "SUSPENDED") return null;

  // Non-blocking activity touch (never blocks auth on failure).
  prisma.developerCliSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { id: session.id, developerId: session.developerId, deviceName: session.deviceName };
}

/** Live suspended check for the approving web session (defense in depth). */
export async function isDeveloperSuspended(developerId: string): Promise<boolean> {
  const user = await prisma.developerUser.findUnique({
    where: { id: developerId },
    select: { status: true },
  });
  return !user || user.status === "SUSPENDED";
}
