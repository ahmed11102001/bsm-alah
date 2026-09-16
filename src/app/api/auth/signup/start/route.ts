// POST /api/auth/signup/start — الخطوة 1: إثبات الإيميل عبر Google
// Body: { idToken } → { signupToken, email, name }
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { verifyGoogleIdToken } from "@/lib/google-verify";
import { createSignupSession } from "@/lib/signup-session";

export async function POST(req: Request) {
  const ip = getIP(req);
  const rl = await rateLimit(`signup-start:${ip}`, { limit: 10, windowSecs: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "كثير من المحاولات — حاول بعد ساعة" },
      { status: 429 }
    );
  }

  const { idToken } = await req.json().catch(() => ({}));
  const identity = await verifyGoogleIdToken(String(idToken ?? ""));
  if (!identity || !identity.emailVerified) {
    return NextResponse.json(
      { error: "تعذر التحقق من حساب Google — حاول مرة أخرى" },
      { status: 401 }
    );
  }

  // الإيميل أثبت ملكيته عبر Google — فإخباره بوجود حساب مسموح وطبيعي
  const existing = await prisma.user.findUnique({
    where: { email: identity.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "الإيميل ده مسجل بالفعل — سجل الدخول", code: "EMAIL_EXISTS" },
      { status: 409 }
    );
  }

  const { token } = await createSignupSession("dashboard", {
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    picture: identity.picture,
  });

  return NextResponse.json({
    signupToken: token,
    email: identity.email,
    name: identity.name,
  });
}
