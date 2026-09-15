import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { signDevToken } from "@/lib/dev-auth";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`claim-register:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("تجاوزت الحد المسموح — حاول بعد ساعة", "RATE_LIMITED", rl.retryAfter);
    }

    const { email, inviteCode, firstName, lastName, phone, password } = await req.json();
    if (!email || !inviteCode || !password || !firstName || !lastName || !phone) {
      return devError("بيانات ناقصة", "INVALID_REQUEST", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const invite = await prisma.developerProjectInvite.findFirst({
      where: { email: normalizedEmail, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!invite || new Date() > invite.expiresAt) {
      return devError("الكود منتهي الصلاحية أو غير صحيح", "INVALID_REQUEST", 400);
    }

    const isValidCode = await bcrypt.compare(inviteCode, invite.codeHash);
    if (!isValidCode) {
      return devError("البيانات غير صحيحة", "INVALID_REQUEST", 400);
    }

    const existingUser = await prisma.developerUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return devError("هذا الحساب مسجل بالفعل، يرجى تسجيل الدخول", "CONFLICT", 400);
    }

    // Atomic update
    const updatedInvite = await prisma.developerProjectInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    if (updatedInvite.count === 0) {
      return devError("تم استخدام الكود بالفعل", "CONFLICT", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.developerUser.create({
      data: {
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        password: hashedPassword,
        status: "ACTIVE",
      },
    });

    // Assign role
    if (invite.role === "OWNER") {
      await prisma.developerProject.update({
        where: { id: invite.projectId },
        data: { ownerId: newUser.id },
      });
    } else {
      await prisma.developerProject.update({
        where: { id: invite.projectId },
        data: { developerId: newUser.id, developerRemovedAt: null },
      });
    }

    const token = await signDevToken({ 
      id: newUser.id,
      email: newUser.email,
      name: `${newUser.firstName || ""} ${newUser.lastName || ""}`.trim() || null,
      status: newUser.status || "ACTIVE"
    });
    const redirectPath = invite.role === "OWNER"
      ? `/developers/welcome/${invite.projectId}`
      : `/developers/portal/projects/${invite.projectId}`;
    const response = NextResponse.json({ redirect: redirectPath });
    response.cookies.set("dev-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[claim-register]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}
