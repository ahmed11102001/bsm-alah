import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const DeleteAccountSchema = z.object({
  password: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const userId = session.user.id as string;

  // Rate limit: 1 request per 10 minutes per IP/User
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limitKey = `delete-account:${userId}:${ip}`;
  const rateLimitResult = await rateLimit(limitKey, { limit: 1, windowSecs: 10 * 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: `كثير من المحاولات. حاول بعد ${rateLimitResult.retryAfter} ثانية.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, role: true, _count: { select: { members: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (user.role === "OWNER" && user._count.members > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف الحساب، لديك أعضاء في الفريق. يرجى حذفهم أولاً." },
        { status: 400 }
      );
    }

    // Check password if user has one
    if (user.password) {
      if (!password) {
        return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 400 });
      }
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الحساب" }, { status: 500 });
  }
}
