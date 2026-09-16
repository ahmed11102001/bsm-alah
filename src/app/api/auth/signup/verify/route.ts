// POST /api/auth/signup/verify — الخطوة 3: التحقق من الكود → إنشاء الحساب
// Body: { signupToken, code } → { ok: true, email } ثم العميل يسجل الدخول
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getSignupSession,
  updateSignupSession,
  deleteSignupSession,
  verifySignupCode,
  SIGNUP_MAX_ATTEMPTS,
} from "@/lib/signup-session";
import { sendWelcomeEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/locale-resolver";

async function finalizeDashboardAccount(state: NonNullable<Awaited<ReturnType<typeof getSignupSession>>>) {
  const now = new Date();
  const existing = await prisma.user.findUnique({
    where: { email: state.google.email },
    select: { id: true, email: true, name: true, phone: true, password: true, onboardingCompleted: true, signupMethod: true },
  });
  if (existing && existing.signupMethod === "GOOGLE" && !existing.phone && !existing.password && !existing.onboardingCompleted) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: state.google.name ?? existing.name ?? state.google.email.split("@")[0],
        phone: state.phone!,
        password: state.passwordHash!,
        emailVerified: now,
        onboardingCompleted: true,
      },
      select: { id: true, email: true, name: true },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, plan: "free", status: "active", campaignsUsedThisMonth: 0, periodResetAt: now, currentPeriodStart: now, currentPeriodEnd: null },
      update: {},
    }).catch(() => {});
    return user;
  }
  try {
    const user = await prisma.user.create({
      data: {
        email: state.google.email,
        name: state.google.name ?? state.google.email.split("@")[0],
        phone: state.phone!,
        password: state.passwordHash!,
        role: "OWNER",
        signupMethod: "GOOGLE",
        emailVerified: now,
        onboardingCompleted: true,
      },
      select: { id: true, email: true, name: true },
    });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "free",
        status: "active",
        campaignsUsedThisMonth: 0,
        periodResetAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: null,
      },
    }).catch(() => {});
    return user;
  } catch (err) {
    // سباق finalize مزدوج: الإيميل unique — الحساب اتعمل فعلًا، اعتبره نجاحًا
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.user.findUnique({
        where: { email: state.google.email },
        select: { id: true, email: true, name: true },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

export async function POST(req: Request) {
  const { signupToken, code } = await req.json().catch(() => ({}));
  const token = String(signupToken ?? "");

  const state = await getSignupSession(token);
  if (!state || state.context !== "dashboard") {
    return NextResponse.json({ error: "جلسة التسجيل غير صالحة أو منتهية" }, { status: 400 });
  }
  if (state.finalized) {
    return NextResponse.json({ error: "تم إنشاء الحساب بالفعل — سجل الدخول", code: "ALREADY_DONE" }, { status: 409 });
  }
  if (!state.phone || !state.passwordHash || !state.termsAcceptedAt) {
    return NextResponse.json({ error: "أكمل بيانات التسجيل أولًا" }, { status: 400 });
  }

  // حماية brute force: 5 محاولات لكل كود، بعدها لازم كود جديد
  if (state.attempts >= SIGNUP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "محاولات كثيرة خاطئة — اطلب كودًا جديدًا", code: "ATTEMPTS_EXCEEDED" },
      { status: 429 }
    );
  }

  const valid = verifySignupCode(state, String(code ?? ""));
  if (!valid) {
    const expired = !state.otpHash || (state.otpExpiresAt && new Date(state.otpExpiresAt).getTime() < Date.now());
    await updateSignupSession(token, { attempts: state.attempts + 1 });
    return NextResponse.json(
      {
        error: expired ? "الكود انتهت صلاحيته — اطلب كودًا جديدًا" : "الكود غير صحيح",
        code: expired ? "OTP_EXPIRED" : "CODE_MISMATCH",
      },
      { status: 400 }
    );
  }

  // ✅ تحقق — أنشئ الحساب مرة واحدة
  await updateSignupSession(token, { verified: true });
  let user;
  try {
    user = await finalizeDashboardAccount(state);
  } catch (err) {
    console.error("[signup-verify] finalize failed:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
  }
  await updateSignupSession(token, { finalized: true });
  await deleteSignupSession(token);

  // الترحيب بالإيميل (موجود ومحفوظ عليه) + referral/cookies مثل التسجيل القديم
  try {
    const locale = getRequestLocale(req);
    await sendWelcomeEmail(user.email, user.name, locale);
    await prisma.user.update({
      where: { id: user.id },
      data: { welcomeEmailSentAt: new Date() },
    }).catch(() => {});
  } catch { /* welcome email best-effort */ }

  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const getCookie = (name: string) => {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : null;
    };
    const refCode = getCookie("wani_ref");
    if (refCode) {
      const { trackReferralSignup } = await import("@/lib/referral/service");
      await trackReferralSignup({ referredUserId: user.id, refCode });
    }
    const metaClickId = getCookie("wani_fbc");
    const openaiClickId = getCookie("wani_oppref");
    if (metaClickId || openaiClickId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(metaClickId ? { metaClickId } : {}),
          ...(openaiClickId ? { openaiClickId } : {}),
        },
      }).catch(() => {});
    }
  } catch { /* attribution best-effort */ }

  return NextResponse.json({ ok: true, email: user.email });
}
