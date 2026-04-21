// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/app/api/auth/reset-password/route.ts
// POST /api/auth/reset-password  { token, password }
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password)
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  if (password.length < 8)
    return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date())
    return NextResponse.json({ error: "الرابط منتهي الصلاحية أو غير صحيح" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data:  { password: hashed },
    }),
    prisma.passwordResetToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ success: true });
}