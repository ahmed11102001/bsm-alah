import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { rateLimit } from "@/lib/rate-limit";

// ── Validate Egyptian/international phone number ──────────────────────────────
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  // قبول: 01xxxxxxxxx أو +201xxxxxxxxx أو 201xxxxxxxxx
  const eg = cleaned.match(/^(?:\+?20)?0?(1[0125]\d{8})$/);
  if (eg) return `+20${eg[1]}`;
  // دولي: +XXXXXXXXXXX
  const intl = cleaned.match(/^\+\d{8,15}$/);
  if (intl) return cleaned;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, phone, email, password } = await req.json();

    // ── Validation ────────────────────────────────────────────────────────────
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: "الاسم الأول والأخير مطلوبين" }, { status: 400 });
    }
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return NextResponse.json({ error: "الاسم يجب أن يكون حرفين على الأقل" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "رقم الموبايل مطلوب" }, { status: 400 });
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "رقم الموبايل غير صحيح" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "الإيميل مطلوب" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-register:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return NextResponse.json({ error: "كثير من المحاولات، حاول بعد شوية" }, { status: 429 });
    }

    // ── Check uniqueness ──────────────────────────────────────────────────────
    const existingEmail = await prisma.developerUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "الإيميل ده مسجل قبل كده" }, { status: 409 });
    }

    // ── Create user ───────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, 12);
    const developer = await prisma.developerUser.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone,
        email: email.toLowerCase(),
        password: hashed,
        status: "PENDING_META",
      },
    });

    const token = await signDevToken({
      id: developer.id,
      email: developer.email,
      name: `${developer.firstName} ${developer.lastName}`,
      status: developer.status,
    });

    const res = NextResponse.json({ ok: true, redirect: "/developers/portal" });
    res.headers.set("Set-Cookie", buildDevSessionCookie(token));
    return res;
  } catch (err) {
    console.error("[dev-register]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}