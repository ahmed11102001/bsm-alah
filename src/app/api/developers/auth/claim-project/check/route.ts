import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { devError, devRateLimited } from "@/lib/dev-errors";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`claim-check:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return devRateLimited("تجاوزت الحد المسموح — حاول بعد ساعة", "RATE_LIMITED", rl.retryAfter);
    }

    const { email, inviteCode } = await req.json();
    if (!email || !inviteCode) {
      return devError("البريد الإلكتروني والكود مطلوبين", "INVALID_REQUEST", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const invite = await prisma.developerProjectInvite.findFirst({
      where: { email: normalizedEmail, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { project: true }
    });

    if (!invite) {
      return devError("البيانات غير صحيحة", "INVALID_REQUEST", 400);
    }

    if (new Date() > invite.expiresAt) {
      return devError("الكود منتهي الصلاحية، اطلب كود جديد", "INVALID_REQUEST", 400);
    }

    const isValid = await bcrypt.compare(inviteCode, invite.codeHash);
    if (!isValid) {
      return devError("البيانات غير صحيحة", "INVALID_REQUEST", 400);
    }

    const existingUser = await prisma.developerUser.findUnique({
      where: { email: normalizedEmail },
    });

    return NextResponse.json({
      ok: true,
      accountExists: !!existingUser,
      projectName: invite.project.name,
      role: invite.role,
    });
  } catch (err) {
    console.error("[claim-check]", err);
    return devError("حصل خطأ", "INTERNAL", 500);
  }
}
