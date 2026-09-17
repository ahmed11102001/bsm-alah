// POST /api/auth/signup/profile — الخطوة 2: رقم الواتساب + الباسورد + الشروط
// Body: { signupToken, phone, password, terms } → يرسل OTP ويرجع { sent: true }
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { getSignupSession, updateSignupSession } from "@/lib/signup-session";
import { requestSignupOtp } from "@/lib/signup-otp-send";
import { markSignupLeadPhone, normalizeLeadLocale } from "@/lib/signup-leads";

export const TERMS_VERSION = "2026-09-v1";

export async function POST(req: Request) {
  const ip = getIP(req);
  const rl = await rateLimit(`signup-profile:${ip}`, { limit: 20, windowSecs: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "كثير من المحاولات — حاول بعد ساعة" },
      { status: 429 }
    );
  }

  const { signupToken, phone, password, terms, locale } = await req.json().catch(() => ({}));

  const state = await getSignupSession(String(signupToken ?? ""));
  if (!state || state.finalized || state.context !== "dashboard") {
    return NextResponse.json({ error: "جلسة التسجيل غير صالحة أو منتهية" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(String(phone ?? ""));
  if (!normalizedPhone) {
    return NextResponse.json({ error: "رقم الواتساب غير صحيح" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });
  }
  if (terms !== true) {
    return NextResponse.json({ error: "يجب الموافقة على الشروط وسياسة الخصوصية" }, { status: 400 });
  }

  // الرقم مرتبط بحساب آخر؟ (المستخدم موثّق عبر Google هنا — فالرسالة المحددة مقبولة)
  const phoneTaken = await prisma.user.findFirst({
    where: { phone: normalizedPhone },
    select: { id: true },
  });
  if (phoneTaken) {
    return NextResponse.json(
      { error: "الرقم ده مرتبط بحساب آخر — استخدم رقمًا مختلفًا أو سجل الدخول", code: "PHONE_TAKEN" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await updateSignupSession(String(signupToken), {
    phone: normalizedPhone,
    passwordHash,
    termsAcceptedAt: new Date().toISOString(),
  });
  if (!updated) {
    return NextResponse.json({ error: "جلسة التسجيل انتهت — ابدأ من جديد" }, { status: 400 });
  }

  // وصل لخطوة الرقم — حدّث الليد (best-effort)
  await markSignupLeadPhone(updated.google.email, normalizedPhone, normalizeLeadLocale(locale));

  const sent = await requestSignupOtp(String(signupToken), ip);
  if (!sent.ok) {
    return NextResponse.json(
      { error: sent.error, code: sent.code, retryAfter: sent.retryAfter },
      { status: sent.code === "COOLDOWN" ? 429 : 400 }
    );
  }

  return NextResponse.json({ sent: true, phone: normalizedPhone });
}
