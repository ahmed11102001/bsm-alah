// POST /api/developers/auth/signup/profile — الخطوة 2: الاسم + واتساب + باسورد + شروط
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { getSignupSession, updateSignupSession } from "@/lib/signup-session";
import { requestSignupOtp } from "@/lib/signup-otp-send";
import { markSignupLeadPhone, normalizeLeadLocale } from "@/lib/signup-leads";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`dev-signup-profile:${ip}`, { limit: 20, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("كثير من المحاولات — حاول بعد ساعة", "RATE_LIMITED", rl.retryAfter);
    }

    const { signupToken, firstName, lastName, phone, password, terms, locale } =
      await req.json().catch(() => ({}));

    const state = await getSignupSession(String(signupToken ?? ""));
    if (!state || state.finalized || state.context !== "portal") {
      return devError("جلسة التسجيل غير صالحة أو منتهية", "INVALID_REQUEST", 400);
    }

    if (!firstName?.trim() || firstName.trim().length < 2 || !lastName?.trim() || lastName.trim().length < 2) {
      return devError("الاسم الأول والأخير مطلوبين (حرفين على الأقل)", "INVALID_REQUEST", 400);
    }
    const normalizedPhone = normalizePhone(String(phone ?? ""));
    if (!normalizedPhone) {
      return devError("رقم الواتساب غير صحيح", "INVALID_REQUEST", 400);
    }
    if (typeof password !== "string" || password.length < 8) {
      return devError("كلمة المرور 8 أحرف على الأقل", "INVALID_REQUEST", 400);
    }
    if (terms !== true) {
      return devError("يجب الموافقة على الشروط وسياسة الخصوصية", "INVALID_REQUEST", 400);
    }

    const phoneTaken = await prisma.developerUser.findFirst({
      where: { OR: [{ phone: normalizedPhone }, { phone: `+${normalizedPhone}` }] },
      select: { id: true },
    });
    if (phoneTaken) {
      return devError(
        "الرقم ده مرتبط بحساب آخر — استخدم رقمًا مختلفًا أو سجل الدخول",
        "CONFLICT",
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await updateSignupSession(String(signupToken), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      passwordHash,
      termsAcceptedAt: new Date().toISOString(),
    });
    if (!updated) {
      return devError("جلسة التسجيل انتهت — ابدأ من جديد", "INVALID_REQUEST", 400);
    }

    // وصل لخطوة الرقم — حدّث الليد (best-effort)
    await markSignupLeadPhone(updated.google.email, normalizedPhone, normalizeLeadLocale(locale));

    const sent = await requestSignupOtp(String(signupToken), ip);
    if (!sent.ok) {
      return devError(
        sent.error ?? "تعذر إرسال الكود",
        sent.code ?? "SEND_FAILED",
        sent.code === "COOLDOWN" || sent.code === "RATE_LIMITED" ? 429 : 400
      );
    }

    return NextResponse.json({ sent: true, phone: normalizedPhone });
  } catch (err) {
    console.error("[dev-signup-profile]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}
