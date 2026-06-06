// src/app/api/developers/auth/register/route.ts
import { NextRequest, NextResponse }           from "next/server";
import prisma                                  from "@/lib/prisma";
import bcrypt                                  from "bcryptjs";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { rateLimit }                           from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password)
      return NextResponse.json({ error: "الإيميل وكلمة المرور مطلوبين" }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-register:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success)
      return NextResponse.json({ error: "كثير من المحاولات، حاول بعد شوية" }, { status: 429 });

    const existing = await prisma.developerUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing)
      return NextResponse.json({ error: "الإيميل ده مسجل قبل كده" }, { status: 409 });

    const hashed    = await bcrypt.hash(password, 12);
    const developer = await prisma.developerUser.create({
      data: { email: email.toLowerCase(), password: hashed, name: name ?? null, status: "PENDING_META" },
    });

    const token = await signDevToken({
      id: developer.id, email: developer.email,
      name: developer.name, status: developer.status,
    });

    const res = NextResponse.json({ ok: true, redirect: "/developers/connect-meta" });
    res.headers.set("Set-Cookie", buildDevSessionCookie(token));
    return res;

  } catch (err) {
    console.error("[dev-register]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}
