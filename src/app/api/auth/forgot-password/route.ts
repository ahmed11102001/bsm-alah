// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendResetEmail } from "@/lib/email";
import { rateLimit, getIP } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // ── Rate Limit: 3 طلبات كل 15 دقيقة لنفس الـ IP ──────────────────────────
  const ip     = getIP(req);
  const result = rateLimit(`forgot:${ip}`, { limit: 3, windowSecs: 15 * 60 });

  if (!result.success) {
    return NextResponse.json(
      { error: `كثير من المحاولات. حاول بعد ${result.retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: email.toLowerCase().trim() },
    select: { id: true, email: true },
  });

  // دايماً نرجع 200 — مش بنكشف وجود الإيميل أو لأ
  if (!user) return NextResponse.json({ success: true });

  // ── أنشئ توكن جديد ────────────────────────────────────────────────────────
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token   = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // ساعة

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expires },
  });

  // ── ابعت الإيميل ──────────────────────────────────────────────────────────
  try {
    await sendResetEmail(user.email, token);
  } catch (err) {
    console.error("[forgot-password] email error:", err);
    // مش بنكشف الخطأ للمستخدم — نرجع 200 عشان مين بيحاول يشوف وجود الإيميل
  }

  return NextResponse.json({ success: true });
}