import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

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

export async function getDevSession(): Promise<DevSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyDevToken(token);
}

export async function getDevSessionFromRequest(req: NextRequest): Promise<DevSession | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyDevToken(token);
}

export function buildDevSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function buildDevLogoutCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}