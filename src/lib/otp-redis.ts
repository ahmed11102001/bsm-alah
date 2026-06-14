// src/lib/otp-redis.ts
// ─── تخزين OTP في Redis بدل الداتابيس ────────────────────────────────────────
//
// الاستخدام:
//   import { storeOtp, verifyOtp, getOtpStatus, deleteOtp } from "@/lib/otp-redis";
//
// لماذا Redis؟
//   1. Auto-expiry (TTL) — مش محتاج cron job لتنظيف الأكواد المنتهية
//   2. أسرع — قراءة وكتابة O(1)
//   3. أأمن — الكود بيتحذف تلقائي بعد انتهاء الصلاحية
//   4. أقل حمل على DB — الأكواد المؤقتة مكانش ليها في DB أصلاً
//
// الفورمات في Redis:
//   Key:   otp:{token}
//   Value: JSON { codeHash, phone, projectId, developerId, status, metaMessageId, sentAt, createdAt }
//   TTL:   expiryMinutes + 5 دقائق buffer (عشان نقدر نرجع status حتى بعد الانتهاء)

import { Redis } from "@upstash/redis";
import { createHash, timingSafeEqual } from "crypto";

// ─── Redis Client ────────────────────────────────────────────────────────────
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "[otp-redis] UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN مطلوبين.\n" +
      "  1. سجّل على console.upstash.com\n" +
      "  2. أنشئ Redis database\n" +
      "  3. حط الـ env vars"
    );
  }

  return new Redis({ url, token });
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OtpData {
  codeHash: string;        // SHA-256 hash of the OTP code
  phone: string;           // E.164 phone number
  projectId: string;
  developerId: string;
  status: "PENDING" | "SENT" | "VERIFIED" | "EXPIRED" | "FAILED";
  metaMessageId: string | null;
  error: string | null;
  sentAt: string | null;    // ISO string
  verifiedAt: string | null;
  createdAt: string;        // ISO string
  expiresAt: string;        // ISO string
}

// ─── Redis Key ────────────────────────────────────────────────────────────────
const OTP_PREFIX = "otp:";

function otpKey(token: string): string {
  return `${OTP_PREFIX}${token}`;
}

// ─── Hash OTP Code (SHA-256) ──────────────────────────────────────────────────
// نستخدم SHA-256 عشان سريع + الكود 6 أرقام بس — الهدف منع تسريب الكود لو Redis اتسرب
export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

// ─── Timing-Safe Compare ─────────────────────────────────────────────────────
// منع timing attack عند المقارنة
export function safeCompareHash(inputCode: string, storedHash: string): boolean {
  const inputHash = hashOtpCode(inputCode);
  try {
    return timingSafeEqual(
      Buffer.from(inputHash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store OTP in Redis
// ═══════════════════════════════════════════════════════════════════════════════
export async function storeOtp(opts: {
  token: string;
  code: string;
  phone: string;
  projectId: string;
  developerId: string;
  status: OtpData["status"];
  metaMessageId?: string | null;
  error?: string | null;
  sentAt?: Date | null;
  expiryMinutes: number;
}): Promise<void> {
  const redis = getRedis();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.expiryMinutes * 60 * 1000);

  const data: OtpData = {
    codeHash: hashOtpCode(opts.code),
    phone: opts.phone,
    projectId: opts.projectId,
    developerId: opts.developerId,
    status: opts.status,
    metaMessageId: opts.metaMessageId ?? null,
    error: opts.error ?? null,
    sentAt: opts.sentAt?.toISOString() ?? null,
    verifiedAt: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // TTL = expiryMinutes + 5 دقائق buffer
  const ttlSeconds = (opts.expiryMinutes + 5) * 60;

  await redis.set(otpKey(opts.token), JSON.stringify(data), { ex: ttlSeconds });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Get OTP data from Redis
// ═══════════════════════════════════════════════════════════════════════════════
export async function getOtp(token: string): Promise<OtpData | null> {
  const redis = getRedis();
  const raw = await redis.get<string>(otpKey(token));
  if (!raw) return null;

  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw as unknown as OtpData;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Verify OTP code
// ═══════════════════════════════════════════════════════════════════════════════
export async function verifyOtp(
  token: string,
  code: string,
  projectId: string
): Promise<{
  success: boolean;
  error?: string;
  phone?: string;
  alreadyVerified?: boolean;
}> {
  const otp = await getOtp(token);

  // Token not found
  if (!otp) {
    return { success: false, error: "Token غير موجود أو منتهي الصلاحية" };
  }

  // Verify project ownership
  if (otp.projectId !== projectId) {
    return { success: false, error: "Token لا ينتمي لهذا الـ API Key" };
  }

  // Already verified
  if (otp.status === "VERIFIED") {
    return { success: true, phone: otp.phone, alreadyVerified: true };
  }

  // Failed OTP
  if (otp.status === "FAILED") {
    return { success: false, error: "OTP لم يُرسل بنجاح، اطلب كود جديد" };
  }

  // Expired check
  const now = new Date();
  if (new Date(otp.expiresAt) < now) {
    // Update status to expired
    await updateOtpStatus(token, "EXPIRED");
    return { success: false, error: "OTP انتهت صلاحيته — اطلب كود جديد" };
  }

  // Timing-safe comparison
  if (!safeCompareHash(code, otp.codeHash)) {
    return { success: false, error: "الكود غير صحيح" };
  }

  // Mark as verified
  await updateOtpStatus(token, "VERIFIED", { verifiedAt: now.toISOString() });

  return { success: true, phone: otp.phone };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update OTP status in Redis
// ═══════════════════════════════════════════════════════════════════════════════
export async function updateOtpStatus(
  token: string,
  status: OtpData["status"],
  extra?: Partial<OtpData>
): Promise<void> {
  const redis = getRedis();
  const otp = await getOtp(token);
  if (!otp) return;

  const updated: OtpData = { ...otp, status, ...extra };

  // Keep remaining TTL
  const ttl = await redis.ttl(otpKey(token));
  if (ttl > 0) {
    await redis.set(otpKey(token), JSON.stringify(updated), { ex: ttl });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Delete OTP from Redis (optional cleanup)
// ═══════════════════════════════════════════════════════════════════════════════
export async function deleteOtp(token: string): Promise<void> {
  const redis = getRedis();
  await redis.del(otpKey(token));
}
