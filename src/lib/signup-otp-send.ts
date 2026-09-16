// src/lib/signup-otp-send.ts
// ─── إرسال OTP التسجيل عبر محرك وني الموحد — بالحمايات الكاملة ─────────────
//  الإرسال يتم من رقم وني عبر "مشروع السيستم" (مملوك لوني، مربوط برقم وني)
//  بنفس المحرك الذي يستخدمه البورتال والـ CLI — لا يوجد مسار إرسال موازٍ.
//
//  الإعداد عبر env (متغير واحد للاعتماد + القالب):
//    WANI_SYSTEM_API_KEY     — مفتاح API لمشروع السيستم (server-side فقط)
//    WANI_SYSTEM_TEMPLATE_ID — قالب OTP المعتمد على مشروع السيستم (أو الاسم)
//    WANI_SYSTEM_TEMPLATE    — بديل بالاسم عند غياب الـ ID
//
//  كل إرسال يُخصم من رصيد مشروع السيستم ويُسجل في الـ ledger — فتكلفة تحقق
//  التسجيل ظاهرة بالجنيه. نفاد رصيد السيستم = توقف الإرسال برسالة عامة
//  (بدون تسريب تفاصيل الفوترة).
//
//  الحمايات:
//  1. cooldown بين كل إرسال والتالي (60s)
//  2. سقف إعادة الإرسال (3/ساعة لكل جلسة)
//  3. سقف إرسال لكل رقم (3/ساعة — حماية فلوس وني من حرق Meta)
//  4. سقف أرقام مميزة لكل IP يوميًا (5 — منع تسجيل أرقام كثيرة)
//  5. fail-closed: عطل Redis أثناء الإرسال = رفض، مش تجاوز

import { Redis } from "@upstash/redis";
import {
  getSignupSession,
  updateSignupSession,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
  SIGNUP_MAX_RESENDS_PER_HOUR,
  SIGNUP_OTP_MINUTES,
} from "@/lib/signup-session";
import { hashOtpCode } from "@/lib/otp-redis";
import { sendProjectOtp } from "@/lib/dev-otp-sender";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PHONES_PER_IP_PER_DAY = 5;
const MAX_SENDS_PER_PHONE_PER_HOUR = 3;

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function systemConfig(): { apiKey: string; templateId?: string; templateName?: string } | null {
  const apiKey = process.env.WANI_SYSTEM_API_KEY;
  if (!apiKey) return null;
  const templateId = process.env.WANI_SYSTEM_TEMPLATE_ID || undefined;
  const templateName = process.env.WANI_SYSTEM_TEMPLATE || undefined;
  if (!templateId && !templateName) return null;
  return { apiKey, templateId, templateName };
}

export function isSignupSenderConfigured(): boolean {
  return systemConfig() !== null;
}

export interface SignupOtpResult {
  ok: boolean;
  error?: string;
  code?: "SESSION_INVALID" | "PROFILE_INCOMPLETE" | "COOLDOWN" | "RESEND_LIMIT" | "PHONE_LIMIT" | "IP_LIMIT" | "SEND_FAILED" | "SENDER_MISCONFIGURED" | "RATE_LIMITED";
  retryAfter?: number;
}

export async function requestSignupOtp(
  signupToken: string,
  ip: string
): Promise<SignupOtpResult> {
  const state = await getSignupSession(signupToken);
  if (!state || state.finalized) {
    return { ok: false, error: "جلسة التسجيل غير صالحة أو منتهية", code: "SESSION_INVALID" };
  }
  if (!state.phone || !state.passwordHash || !state.termsAcceptedAt) {
    return { ok: false, error: "أكمل بيانات التسجيل أولًا", code: "PROFILE_INCOMPLETE" };
  }

  const sys = systemConfig();
  if (!sys) {
    return { ok: false, error: "خدمة الإرسال غير مفعّلة حاليًا", code: "SENDER_MISCONFIGURED" };
  }

  const now = Date.now();

  // 1) cooldown
  if (state.lastSentAt) {
    const elapsed = (now - new Date(state.lastSentAt).getTime()) / 1000;
    if (elapsed < SIGNUP_RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        error: `انتظر ${Math.ceil(SIGNUP_RESEND_COOLDOWN_SECONDS - elapsed)} ثانية قبل إعادة الإرسال`,
        code: "COOLDOWN",
        retryAfter: Math.ceil(SIGNUP_RESEND_COOLDOWN_SECONDS - elapsed),
      };
    }
  }

  // 2) سقف إعادة الإرسال للجلسة (نافذة ساعة متحركة)
  let resends = state.resends;
  const windowStart = state.resendsWindowStart ? new Date(state.resendsWindowStart).getTime() : 0;
  if (!windowStart || now - windowStart > 3600_000) {
    resends = 0;
  }
  if (resends >= SIGNUP_MAX_RESENDS_PER_HOUR) {
    return { ok: false, error: "تجاوزت حد إعادة الإرسال — حاول بعد ساعة", code: "RESEND_LIMIT" };
  }

  // 3) سقف الإرسال لكل رقم (fail-closed)
  const rlPhone = await rateLimit(`signup-otp-phone:${state.phone}`, {
    limit: MAX_SENDS_PER_PHONE_PER_HOUR,
    windowSecs: 3600,
  }, { failureMode: "closed" });
  if (!rlPhone.success) {
    if (rlPhone.unavailable) {
      return { ok: false, error: "خدمة الحماية متعطلة — حاول بعد قليل", code: "RATE_LIMITED", retryAfter: rlPhone.retryAfter };
    }
    return { ok: false, error: "تم إرسال أكواد كثيرة لهذا الرقم — حاول بعد ساعة", code: "PHONE_LIMIT", retryAfter: rlPhone.retryAfter };
  }

  // 4) سقف الأرقام المميزة لكل IP يوميًا (fail-closed)
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !redisToken) {
      return { ok: false, error: "خدمة الحماية متعطلة — حاول بعد قليل", code: "RATE_LIMITED" };
    }
    const redis = new Redis({ url, token: redisToken });
    const ipKey = `signup-ip-phones:${ip}:${dayKey()}`;
    const added = await redis.sadd(ipKey, state.phone);
    await redis.expire(ipKey, 26 * 3600);
    const count = await redis.scard(ipKey);
    void added;
    if (count > MAX_PHONES_PER_IP_PER_DAY) {
      return { ok: false, error: "تم تسجيل أرقام كثيرة من هذا الجهاز اليوم", code: "IP_LIMIT" };
    }
  } catch {
    return { ok: false, error: "خدمة الحماية متعطلة — حاول بعد قليل", code: "RATE_LIMITED" };
  }

  // 5) الإرسال عبر المحرك الموحد (مشروع السيستم — يُخصم من رصيده ويُسجل)
  const sent = await sendProjectOtp({
    apiKey: sys.apiKey,
    body: {
      phone: state.phone,
      templateId: sys.templateId,
      templateName: sys.templateName,
      expiryMinutes: SIGNUP_OTP_MINUTES,
    },
    ip,
    locale: "ar",
    revealCode: true,
  });

  if (!sent.json.ok || !sent.plainCode) {
    const engineCode = String((sent.json as any)?.code ?? "");
    // نفاد رصيد السيستم أو عطل إعداده — رسالة عامة بدون تسريب
    if (
      engineCode === "INSUFFICIENT_BALANCE" ||
      engineCode === "INVALID_API_KEY" ||
      engineCode === "NO_META_CONNECTION" ||
      (engineCode.startsWith("TEMPLATE_") && engineCode !== "TEMPLATE_REF_REQUIRED")
    ) {
      console.error("[signup-otp] system project not ready:", engineCode);
      return { ok: false, error: "خدمة الإرسال متوقفة مؤقتًا — حاول بعد قليل", code: "SENDER_MISCONFIGURED" };
    }
    if (engineCode === "RATE_LIMIT_PHONE" || engineCode === "RATE_LIMIT_IP") {
      return {
        ok: false,
        error: "تم إرسال أكواد كثيرة — حاول بعد ساعة",
        code: "PHONE_LIMIT",
        retryAfter: Number((sent.json as any)?.retryAfter ?? 60),
      };
    }
    if (engineCode === "RATE_LIMITER_UNAVAILABLE") {
      return { ok: false, error: "خدمة الحماية متعطلة — حاول بعد قليل", code: "RATE_LIMITED" };
    }
    return { ok: false, error: "تعذر إرسال الكود — حاول مرة أخرى", code: "SEND_FAILED" };
  }

  const freshWindowStart =
    !windowStart || now - windowStart > 3600_000
      ? new Date(now).toISOString()
      : state.resendsWindowStart;
  await updateSignupSession(signupToken, {
    otpHash: hashOtpCode(sent.plainCode),
    otpExpiresAt: String((sent.json as any)?.expiresAt ?? new Date(now + SIGNUP_OTP_MINUTES * 60 * 1000).toISOString()),
    attempts: 0,
    resends: resends + 1,
    resendsWindowStart: freshWindowStart,
    lastSentAt: new Date(now).toISOString(),
    verified: false,
  });

  return { ok: true };
}
