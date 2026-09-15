import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest, signDevToken, buildDevSessionCookie } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  try {
    const session = await getDevSessionFromRequest(req);
    if (!session) {
      return devError("غير مصرّح", "AUTH_REQUIRED", 401);
    }

    const { firstName, lastName, currentPassword, newPassword } = await req.json();

    if (!firstName?.trim() || !lastName?.trim()) {
      return devError("الاسم الأول والأخير مطلوبين", "INVALID_REQUEST", 400);
    }

    const developer = await prisma.developerUser.findUnique({
      where: { id: session.id },
    });

    if (!developer) {
      return devError("حساب المطور غير موجود", "NOT_FOUND", 404);
    }

    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    // If changing password
    if (currentPassword && newPassword) {
      const isValid = await bcrypt.compare(currentPassword, developer.password);
      if (!isValid) {
        return devError("كلمة المرور الحالية غير صحيحة", "INVALID_CREDENTIALS", 400);
      }
      if (newPassword.length < 8) {
        return devError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل", "INVALID_REQUEST", 400);
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.developerUser.update({
      where: { id: session.id },
      data: updateData,
    });

    // Update token session just in case name changed
    const token = await signDevToken({
      id: updated.id,
      email: updated.email,
      name: `${updated.firstName} ${updated.lastName}`,
      status: updated.status,
    });

    const res = NextResponse.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
    res.headers.set("Set-Cookie", buildDevSessionCookie(token));
    return res;
  } catch (error) {
    console.error("[dev-settings-update]", error);
    return devError("حصل خطأ أثناء تحديث الإعدادات", "INTERNAL", 500);
  }
}
