import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { devError, devRateLimited } from "@/lib/dev-errors";
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
      return devError("الاسم الأول والأخير مطلوبين", "INVALID_REQUEST", 400);
    }
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return devError("الاسم يجب أن يكون حرفين على الأقل", "INVALID_REQUEST", 400);
    }
    if (!phone) {
      return devError("رقم الموبايل مطلوب", "INVALID_REQUEST", 400);
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return devError("رقم الموبايل غير صحيح", "INVALID_REQUEST", 400);
    }
    if (!email) {
      return devError("الإيميل مطلوب", "INVALID_REQUEST", 400);
    }
    if (!password || password.length < 8) {
      return devError("كلمة المرور 8 أحرف على الأقل", "INVALID_REQUEST", 400);
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = await rateLimit(`dev-register:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("كثير من المحاولات، حاول بعد شوية", "RATE_LIMITED", rl.retryAfter);
    }

    // ── Check uniqueness ──────────────────────────────────────────────────────
    const existingEmail = await prisma.developerUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      return devError("الإيميل ده مسجل قبل كده", "CONFLICT", 409);
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
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}