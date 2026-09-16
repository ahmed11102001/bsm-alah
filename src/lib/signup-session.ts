// src/lib/signup-session.ts
// ══════════════════════════════════════════════════════════════════════════════
//  حالة التسجيل المؤقتة — لا يُنشأ أي حساب قبل نجاح OTP.
//
//  Google verified → جمع رقم + باسورد → حالة مؤقتة (Redis + TTL) → إرسال OTP
//  → تحقق → FINALIZE (إنشاء الحساب مرة واحدة فقط).
//
//  لو اليوزر وقف في أي مرحلة قبل التحقق: مفيش حساب معلق — المفتاح بينتهي لوحده.
// ══════════════════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";
import { safeCompareHash } from "@/lib/otp-redis";

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("[signup-session] Redis env missing");
  return new Redis({ url, token });
}

export const SIGNUP_TTL_SECONDS = 15 * 60;
export const SIGNUP_OTP_MINUTES = 10;
export const SIGNUP_MAX_ATTEMPTS = 5;
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;
export const SIGNUP_MAX_RESENDS_PER_HOUR = 3;

export type SignupContext = "dashboard" | "portal";

export interface SignupState {
  v: 1;
  context: SignupContext;
  google: { sub: string; email: string; name: string | null; picture: string | null };
  phone: string | null;          // E.164 بدون +
  passwordHash: string | null;   // bcrypt — يُخزن بعد خطوة البيانات فقط
  termsAcceptedAt: string | null;
  firstName: string | null;      // للبورتال (الداشبورد يستخدم اسم جوجل)
  lastName: string | null;
  otpHash: string | null;
  otpExpiresAt: string | null;
  attempts: number;
  resends: number;
  resendsWindowStart: string | null;
  lastSentAt: string | null;
  verified: boolean;
  finalized: boolean;
  createdAt: string;
}

const PREFIX = "signup:";

function key(token: string): string {
  return `${PREFIX}${token}`;
}

export function newSignupToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSignupSession(
  context: SignupContext,
  google: SignupState["google"]
): Promise<{ token: string; state: SignupState }> {
  const redis = getRedis();
  const token = newSignupToken();
  const now = new Date().toISOString();
  const state: SignupState = {
    v: 1,
    context,
    google,
    phone: null,
    passwordHash: null,
    termsAcceptedAt: null,
    firstName: null,
    lastName: null,
    otpHash: null,
    otpExpiresAt: null,
    attempts: 0,
    resends: 0,
    resendsWindowStart: null,
    lastSentAt: null,
    verified: false,
    finalized: false,
    createdAt: now,
  };
  await redis.set(key(token), JSON.stringify(state), { ex: SIGNUP_TTL_SECONDS });
  return { token, state };
}

export async function getSignupSession(token: string): Promise<SignupState | null> {
  try {
    if (!token || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
    const redis = getRedis();
    const raw = await redis.get<string>(key(token));
    if (!raw) return null;
    const state = (typeof raw === "string" ? JSON.parse(raw) : raw) as SignupState;
    if (!state || state.v !== 1) return null;
    return state;
  } catch {
    return null;
  }
}

async function saveSignupSession(token: string, state: SignupState): Promise<void> {
  const redis = getRedis();
  const ttl = await redis.ttl(key(token)).catch(() => SIGNUP_TTL_SECONDS);
  await redis.set(key(token), JSON.stringify(state), { ex: ttl > 0 ? ttl : SIGNUP_TTL_SECONDS });
}

export async function updateSignupSession(
  token: string,
  patch: Partial<SignupState>
): Promise<SignupState | null> {
  const state = await getSignupSession(token);
  if (!state) return null;
  const updated = { ...state, ...patch };
  await saveSignupSession(token, updated);
  return updated;
}

export async function deleteSignupSession(token: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key(token));
  } catch {
    /* silent */
  }
}

export function verifySignupCode(state: SignupState, code: string): boolean {
  if (!state.otpHash || !state.otpExpiresAt) return false;
  if (new Date(state.otpExpiresAt).getTime() < Date.now()) return false;
  if (typeof code !== "string") return false;
  return safeCompareHash(code.trim(), state.otpHash);
}
