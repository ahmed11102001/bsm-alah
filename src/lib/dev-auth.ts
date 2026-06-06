// src/lib/dev-auth.ts
// ── Developer Portal Auth ─────────────────────────────────────────────────────
// مستقل تماماً عن NextAuth — JWT بسيط في httpOnly cookie
// مش بيأثر على marketing auth خالص

import { SignJWT, jwtVerify } from "jose";
import { cookies }            from "next/headers";
import { NextRequest }        from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.DEV_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-fallback-secret"
);

const COOKIE_NAME = "dev-session";
const MAX_AGE     = 30 * 24 * 60 * 60; // 30 يوم

export interface DevSession {
  id:     string;
  email:  string;
  name:   string | null;
  status: string;
}

// ── Sign ─────────────────────────────────────────────────────────────────────
export async function signDevToken(payload: DevSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

// ── Verify ───────────────────────────────────────────────────────────────────
export async function verifyDevToken(token: string): Promise<DevSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as DevSession;
  } catch {
    return null;
  }
}

// ── Get session from cookie (Server Component / Route Handler) ────────────────
export async function getDevSession(): Promise<DevSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyDevToken(token);
}

// ── Get session from Request (Middleware) ─────────────────────────────────────
export async function getDevSessionFromRequest(req: NextRequest): Promise<DevSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyDevToken(token);
}

// ── Set cookie (في Route Handler بعد login ناجح) ─────────────────────────────
export function buildDevSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/developers; SameSite=Lax; Max-Age=${MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

// ── Clear cookie (logout) ─────────────────────────────────────────────────────
export function buildDevLogoutCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/developers; SameSite=Lax; Max-Age=0`;
}
