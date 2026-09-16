import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devError, devRateLimited } from "@/lib/dev-errors";
import { signDevToken } from "@/lib/dev-auth";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`claim-login:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("تجاوزت الحد المسموح — حاول بعد ساعة", "RATE_LIMITED", rl.retryAfter);
    }

    const { email, inviteCode, password } = await req.json();
    if (!email || !inviteCode || !password) {
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

    if (!existingUser) {
      return devError("الحساب غير موجود", "INVALID_REQUEST", 400);
    }

    const isValidPassword = await bcrypt.compare(password, existingUser.password);
    if (!isValidPassword) {
      return devError("كلمة المرور غير صحيحة", "INVALID_CREDENTIALS", 401);
    }

    if (existingUser.status === "SUSPENDED") {
      return devError("الحساب موقف، تواصل مع الدعم", "ACCOUNT_SUSPENDED", 403);
    }

    // Atomic update
    const updatedInvite = await prisma.developerProjectInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    if (updatedInvite.count === 0) {
      return devError("تم استخدام الكود بالفعل", "CONFLICT", 400);
    }

    // Assign role
    if (invite.role === "OWNER") {
      const existing = await prisma.developerProject.findUnique({
        where: { id: invite.projectId },
        select: { ownerId: true, developerId: true, name: true },
      });
      if (!existing?.ownerId) {
        // أول تسليم → بداية الحصة الشهرية المجانية (30) من اللحظة دي
        const { newMonthlyPeriod } = await import("@/lib/portal-billing");
        const { start, end } = newMonthlyPeriod();
        await prisma.developerProject.update({
          where: { id: invite.projectId },
          data: {
            ownerId: existingUser.id,
            monthlyFreeTotal: 30,
            monthlyFreeUsed: 0,
            monthlyPeriodStart: start,
            monthlyPeriodEnd: end,
          },
        });

        // إشعار المطور: العميل استلم المشروع
        void (async () => {
          const { notifyDeveloper } = await import("@/lib/dev-notifications");
          const { DEVELOPERS_BASE_URL } = await import("@/lib/dev-links");
          if (!existing?.developerId) return;
          await notifyDeveloper(existing.developerId, {
            type: "TRANSFER",
            title: "العميل استلم المشروع",
            message: `استلم "${existingUser.firstName} ${existingUser.lastName}" مشروع "${existing.name}" — بدأت حصته الشهرية (30 رسالة مجانية).`,
            link: `${DEVELOPERS_BASE_URL}/portal/projects/${invite.projectId}`,
          });
        })();
      } else {
        await prisma.developerProject.update({
          where: { id: invite.projectId },
          data: { ownerId: existingUser.id },
        });
      }
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
    console.error("[claim-login]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}
