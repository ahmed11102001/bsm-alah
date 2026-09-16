// POST /api/developers/auth/signup/start — الخطوة 1: إثبات الإيميل عبر Google
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { verifyGoogleIdToken } from "@/lib/google-verify";
import { createSignupSession } from "@/lib/signup-session";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`dev-signup-start:${ip}`, { limit: 10, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("كثير من المحاولات — حاول بعد ساعة", "RATE_LIMITED", rl.retryAfter);
    }

    const { idToken } = await req.json().catch(() => ({}));
    const identity = await verifyGoogleIdToken(String(idToken ?? ""));
    if (!identity || !identity.emailVerified) {
      return devError("تعذر التحقق من حساب Google — حاول مرة أخرى", "INVALID_REQUEST", 401);
    }

    const existing = await prisma.developerUser.findUnique({
      where: { email: identity.email },
      select: { id: true },
    });
    if (existing) {
      return devError("الإيميل ده مسجل بالفعل — سجل الدخول", "CONFLICT", 409);
    }

    const { token } = await createSignupSession("portal", {
      sub: identity.sub,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
    });

    return NextResponse.json({ signupToken: token, email: identity.email, name: identity.name });
  } catch (err) {
    console.error("[dev-signup-start]", err);
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}
