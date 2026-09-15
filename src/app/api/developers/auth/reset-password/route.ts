import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { devError } from "@/lib/dev-errors";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return devError("الرابط غير صحيح أو كلمة المرور مفقودة", "INVALID_REQUEST", 400);
    }

    if (password.length < 8) {
      return devError("كلمة المرور يجب أن تكون 8 أحرف على الأقل", "INVALID_REQUEST", 400);
    }

    const resetToken = await prisma.developerPasswordResetToken.findUnique({
      where: { token },
      include: { developer: true },
    });

    if (!resetToken) {
      return devError("رابط الاستعادة غير صحيح أو منتهي الصلاحية", "INVALID_REQUEST", 400);
    }

    if (resetToken.expires < new Date()) {
      await prisma.developerPasswordResetToken.delete({ where: { id: resetToken.id } });
      return devError("رابط الاستعادة منتهي الصلاحية", "INVALID_REQUEST", 400);
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
    return devError("حصل خطأ، حاول تاني", "INTERNAL", 500);
  }
}
