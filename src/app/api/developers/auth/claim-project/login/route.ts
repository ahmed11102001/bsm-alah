import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { signDevToken } from "@/lib/dev-auth";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`claim-login:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return NextResponse.json({ error: "تجاوزت الحد المسموح — حاول بعد ساعة" }, { status: 429 });
    }

    const { email, inviteCode, password } = await req.json();
    if (!email || !inviteCode || !password) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const invite = await prisma.developerProjectInvite.findFirst({
      where: { email: normalizedEmail, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (!invite || new Date() > invite.expiresAt) {
      return NextResponse.json({ error: "الكود منتهي الصلاحية أو غير صحيح" }, { status: 400 });
    }

    const isValidCode = await bcrypt.compare(inviteCode, invite.codeHash);
    if (!isValidCode) {
      return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
    }

    const existingUser = await prisma.developerUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });
    }

    const isValidPassword = await bcrypt.compare(password, existingUser.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Atomic update
    const updatedInvite = await prisma.developerProjectInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    if (updatedInvite.count === 0) {
      return NextResponse.json({ error: "تم استخدام الكود بالفعل" }, { status: 400 });
    }

    // Assign role
    if (invite.role === "OWNER") {
      await prisma.developerProject.update({
        where: { id: invite.projectId },
        data: { ownerId: existingUser.id },
      });
    } else {
      await prisma.developerProject.update({
        where: { id: invite.projectId },
        data: { developerId: existingUser.id, developerRemovedAt: null },
      });
    }

    const token = await signDevToken({
      id: existingUser.id,
      email: existingUser.email,
      name: `${existingUser.firstName || ""} ${existingUser.lastName || ""}`.trim() || null,
      status: existingUser.status || "ACTIVE"
    });
    const response = NextResponse.json({ redirect: `/developers/welcome/${invite.projectId}` });
    response.cookies.set("dev-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[claim-login]", err);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}
