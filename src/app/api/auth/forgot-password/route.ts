// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// ── Simple email sender using fetch (works with Resend / Brevo / any REST API)
// Replace SEND_EMAIL with your actual email service call.
// For now it logs the link — swap the function body with your provider.
async function sendResetEmail(to: string, resetUrl: string) {
  // ── Option A: Resend (recommended for Next.js) ──────────────────
  // await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     from: "no-reply@yourdomain.com",
  //     to,
  //     subject: "إعادة تعيين كلمة المرور",
  //     html: `<p>انقر هنا لإعادة تعيين كلمة المرور:</p><a href="${resetUrl}">${resetUrl}</a>`,
  //   }),
  // });

  // ── For now: just log (remove in production) ─────────────────────
  console.log(`[RESET LINK] ${to} → ${resetUrl}`);
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email?.trim()) {
    return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  // Always return 200 — don't leak whether email exists
  if (!user) return NextResponse.json({ success: true });

  // Delete any existing token for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Create a new token (expires in 1 hour)
  const token   = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expires },
  });

  const baseUrl  = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendResetEmail(user.email, resetUrl);

  return NextResponse.json({ success: true });
}