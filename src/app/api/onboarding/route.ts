// src/app/api/onboarding/route.ts
// بيحفظ رقم الواتساب للمستخدم الجديد من Google

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OnboardingSchema, parseInput } from "@/lib/schemas";
import { sendWelcomeEmail } from "@/lib/email";
import { getRequestLocale } from "@/lib/locale-resolver";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح", code: "UNAUTHORIZED" }, { status: 401 });
  }

  // ── Server-side guard: الـ endpoint ده مخصوص لـ Google Onboarding بس ──────
  // session.user.needsOnboarding محسوبة بنفس القاعدة في auth.ts (jwt callback):
  // Google + مش Team Member + onboarding لسه مكملش. Manual وTeam Member
  // ممنوعين تمامًا حتى لو وصلوا للـ route ده بأي طريقة غير الـ UI.
  if (!session.user.needsOnboarding) {
    return NextResponse.json({ error: "غير مسموح", code: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = parseInput(OnboardingSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: "INVALID_INPUT" }, { status: 400 });

  const { phone: cleaned } = parsed.data;

  // تأكد إن الرقم مش مستخدم من حساب تاني
  const existing = await prisma.user.findFirst({
    where: {
      phone: cleaned,
      NOT: { id: session.user.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "هذا الرقم مستخدم بالفعل", code: "PHONE_EXISTS" }, { status: 409 });
  }

  await prisma.user.updateMany({
    where: { id: session.user.id },
    data:  { phone: cleaned, onboardingCompleted: true },
  });

  // ── إرسال إيميل الترحيب بالعميل بعد إدخال رقمه بنجاح ودخوله الداشبورد ──────
  try {
    const locale = getRequestLocale(req);
    const userEmail = session.user.email;
    const userName = session.user.name;
    if (userEmail) {
      await sendWelcomeEmail(userEmail, userName, locale);
    }
  } catch (welcomeError) {
    console.error(
      "[onboarding] Welcome email delivery failed",
      welcomeError instanceof Error ? welcomeError.message : welcomeError
    );
  }

  return NextResponse.json({ ok: true });
}