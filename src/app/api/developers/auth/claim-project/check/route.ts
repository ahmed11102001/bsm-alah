import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, getIP } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getIP(req);
    const rl = await rateLimit(`claim-check:${ip}`, { limit: 5, windowSecs: 3600 });
    if (!rl.success) {
      return NextResponse.json({ error: "تجاوزت الحد المسموح — حاول بعد ساعة" }, { status: 429 });
    }

    const { email, inviteCode } = await req.json();
    if (!email || !inviteCode) {
      return NextResponse.json({ error: "البريد الإلكتروني والكود مطلوبين" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const invite = await prisma.developerProjectInvite.findFirst({
      where: { email: normalizedEmail, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { project: true }
    });

    if (!invite) {
      return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: "الكود منتهي الصلاحية، اطلب كود جديد" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(inviteCode, invite.codeHash);
    if (!isValid) {
      return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
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
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}
