// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { RegisterSchema, parseInput } from "@/lib/schemas";
import crypto from "crypto";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  const ip = getIP(req);
  const result = await rateLimit(`register:${ip}`, { limit: 5, windowSecs: 60 * 60 });

  if (!result.success) {
    return NextResponse.json(
      { error: `كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
    );
  }

  try {
    const parsed = parseInput(RegisterSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { email, password, name, phone } = parsed.data;

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول أو استخدام بريد آخر" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { user, verificationToken } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          phone: normalizedPhone,
          password: hashedPassword,
          role: "OWNER",
          signupMethod: "MANUAL",
          onboardingCompleted: true,
        },
      });

      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "free",
          status: "active",
          campaignsUsedThisMonth: 0,
          periodResetAt: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
        },
      });

      const verificationToken = crypto.randomBytes(32).toString("hex");
      await tx.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId: newUser.id,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { user: newUser, verificationToken };
    });

    // Verification email is mandatory for the activation flow.
    // If delivery fails, remove the token so the user can safely request a new one.
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      await prisma.emailVerificationToken.delete({ where: { token: verificationToken } }).catch(() => undefined);
      console.error(
        "[register] verification email delivery failed",
        emailError instanceof Error ? emailError.message : emailError
      );

      return NextResponse.json(
        { error: "تم إنشاء الحساب، لكن تعذر إرسال رسالة تأكيد البريد الإلكتروني. حاول إعادة إرسال رسالة التأكيد." },
        { status: 503 }
      );
    }

    // Welcome email is best-effort: signup and verification must not fail because
    // the optional welcome message could not be delivered.
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (welcomeError) {
      console.error(
        "[register] welcome email delivery failed",
        welcomeError instanceof Error ? welcomeError.message : welcomeError
      );
    }

    // ── ربط الإحالة (Referral Attribution) إذا كان المستخدم قادمًا من رابط إحالة ──
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)wani_ref=([^;]+)/);
      const refCode = match ? decodeURIComponent(match[1]) : null;
      if (refCode) {
        const { trackReferralSignup } = await import("@/lib/referral/service");
        await trackReferralSignup({ referredUserId: user.id, refCode });
      }
    } catch (refErr) {
      console.error("[register] failed to link referral:", refErr);
    }

    return NextResponse.json(
      {
        message: "تم إنشاء الحساب بنجاح. راجع بريدك الإلكتروني لتأكيد الحساب.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء التسجيل" },
      { status: 500 }
    );
  }
}