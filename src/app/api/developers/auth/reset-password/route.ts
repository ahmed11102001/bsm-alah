import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "الرابط غير صحيح أو كلمة المرور مفقودة" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    const resetToken = await prisma.developerPasswordResetToken.findUnique({
      where: { token },
      include: { developer: true },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "رابط الاستعادة غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    if (resetToken.expires < new Date()) {
      await prisma.developerPasswordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: "رابط الاستعادة منتهي الصلاحية" }, { status: 400 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.developerUser.update({
      where: { id: resetToken.developerId },
      data: { password: hashedPassword },
    });

    // Clean up tokens for this user
    await prisma.developerPasswordResetToken.deleteMany({
      where: { developerId: resetToken.developerId },
    });

    return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("[dev-reset-password]", err);
    return NextResponse.json({ error: "حصل خطأ، حاول تاني" }, { status: 500 });
  }
}
