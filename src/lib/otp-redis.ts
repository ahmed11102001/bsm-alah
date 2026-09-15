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
import { createHmac, timingSafeEqual } from "crypto";

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

// ─── Hash OTP Code (HMAC-SHA-256 with server pepper) ─────────────────────────
// الكود 6 أرقام فقط (مليون احتمال) — SHA-256 عادي يتكسر في أجزاء من الثانية
// لو Redis اتسربت (brute force تافه). الـ pepper السري من السيرفر يجعل الـ
// rainbow/brute-force مستحيلًا عمليًا بدون السر. تغيير الـ pepper يُبطل الأكواد
// القائمة (≤ 60 دقيقة) — مقبول مقابل الهدف الأمني المعلن.
// ملحوظة: createHash ما زال مستخدمًا لـ API keys في routes أخرى.
function getOtpPepper(): string {
  const pepper =
    process.env.OTP_HASH_PEPPER ??
    process.env.DEV_JWT_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[otp-redis] OTP_HASH_PEPPER مطلوب في Production — لا تشغّل بدونه.");
    }
    return "dev-only-otp-pepper-NOT-FOR-PRODUCTION";
  }
  return pepper;
}

export function hashOtpCode(code: string): string {
  return createHmac("sha256", getOtpPepper()).update(code.trim()).digest("hex");
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
  code?: string;
  phone?: string;
  alreadyVerified?: boolean;
}> {
  const otp = await getOtp(token);

  // Token not found
  if (!otp) {
    return { success: false, code: "TOKEN_NOT_FOUND", error: "Token غير موجود أو منتهي الصلاحية" };
  }

  // Verify project ownership
  if (otp.projectId !== projectId) {
    return { success: false, code: "TOKEN_WRONG_PROJECT", error: "Token لا ينتمي لهذا الـ API Key" };
  }

  // Already verified
  if (otp.status === "VERIFIED") {
    // A verified token is single-use. Keep this invariant inside the helper
    // so every caller rejects replay by default instead of remembering to
    // inspect an auxiliary flag.
    return {
      success: false,
      code: "ALREADY_VERIFIED",
      error: "OTP تم التحقق منه مسبقاً ولا يمكن استخدامه مرة أخرى",
      phone: otp.phone,
      alreadyVerified: true,
    };
  }

  // Failed OTP
  if (otp.status === "FAILED") {
    return { success: false, code: "OTP_NOT_SENT", error: "OTP لم يُرسل بنجاح، اطلب كود جديد" };
  }

  // Expired check
  const now = new Date();
  if (new Date(otp.expiresAt) < now) {
    // Update status to expired
    await updateOtpStatus(token, "EXPIRED");
    return { success: false, code: "OTP_EXPIRED", error: "OTP انتهت صلاحيته — اطلب كود جديد" };
  }

  // Timing-safe comparison
  if (!safeCompareHash(code, otp.codeHash)) {
    return { success: false, code: "CODE_MISMATCH", error: "الكود غير صحيح" };
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
