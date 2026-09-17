// POST /api/developers/auth/signup/verify — الخطوة 3: التحقق → إنشاء الحساب + جلسة
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import {
  getSignupSession,
  updateSignupSession,
  deleteSignupSession,
  verifySignupCode,
  SIGNUP_MAX_ATTEMPTS,
} from "@/lib/signup-session";

async function finalizePortalAccount(state: NonNullable<Awaited<ReturnType<typeof getSignupSession>>>) {
  try {
    const developer = await prisma.developerUser.create({
      data: {
        email: state.google.email,
        firstName: state.firstName!,
        lastName: state.lastName!,
        phone: state.phone!,
        password: state.passwordHash!,
        googleSub: state.google.sub || null,
        status: "ACTIVE",
      },
    });
    return developer;
  } catch (err) {
    // سباق finalize مزدوج: الإيميل unique — الحساب اتعمل فعلًا
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.developerUser.findUnique({
        where: { email: state.google.email },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { signupToken, code } = await req.json().catch(() => ({}));
    const token = String(signupToken ?? "");

    const state = await getSignupSession(token);
    if (!state || state.context !== "portal") {
      return devError("جلسة التسجيل غير صالحة أو منتهية", "INVALID_REQUEST", 400);
    }
    if (state.finalized) {
      return devError("تم إنشاء الحساب بالفعل — سجل الدخول", "CONFLICT", 409);
    }
    if (!state.phone || !state.passwordHash || !state.termsAcceptedAt || !state.firstName || !state.lastName) {
      return devError("أكمل بيانات التسجيل أولًا", "INVALID_REQUEST", 400);
    }

    if (state.attempts >= SIGNUP_MAX_ATTEMPTS) {
      return devError("محاولات كثيرة خاطئة — اطلب كودًا جديدًا", "ATTEMPTS_EXCEEDED", 429);
    }

    const valid = verifySignupCode(state, String(code ?? ""));
    if (!valid) {
      const expired = !state.otpHash || (state.otpExpiresAt && new Date(state.otpExpiresAt).getTime() < Date.now());
      await updateSignupSession(token, { attempts: state.attempts + 1 });
      return devError(
        expired ? "الكود انتهت صلاحيته — اطلب كودًا جديدًا" : "الكود غير صحيح",
        expired ? "OTP_EXPIRED" : "CODE_MISMATCH",
        400
      );
    }

    await updateSignupSession(token, { verified: true });
    let developer;
    try {
      developer = await finalizePortalAccount(state);
    } catch (err) {
      console.error("[dev-signup-verify] finalize failed:", err);
      return devError("حدث خطأ أثناء إنشاء الحساب", "INTERNAL", 500);
    }
    await updateSignupSession(token, { finalized: true });
    await deleteSignupSession(token);

    // كمّل التسجيل — اقفل الليد (best-effort)
    try {
      const { markSignupLeadConverted } = await import("@/lib/signup-leads");
      await markSignupLeadConverted(state.google.email);
    } catch {}

    const devToken = await signDevToken({
      id: developer.id,
      email: developer.email,
      name: `${developer.firstName} ${developer.lastName}`,
      status: developer.status,
    });

    const res = NextResponse.json({ ok: true, redirect: "/developers/portal" });
    res.headers.set("Set-Cookie", buildDevSessionCookie(devToken));
    return res;
  } catch (err) {
    console.error("[dev-signup-verify]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}
