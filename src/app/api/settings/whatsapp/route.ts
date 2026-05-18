import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }
    const ownerId = ((session.user as any).parentId as string | null) ?? (session.user as any).id;

    const { accessToken, phoneNumberId, wabaId } = await req.json();

    if (!accessToken || !phoneNumberId || !wabaId) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    // تشفير الـ token قبل الحفظ في DB
    const encryptedToken = encryptToken(accessToken);

    // حفظ أو تحديث بيانات واتساب الخاص باليوزر
    await prisma.whatsAppAccount.upsert({
      where: { userId: ownerId },
      update: {
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
      },
      create: {
        userId: ownerId,
        accessToken: encryptedToken,
        phoneNumberId,
        wabaId,
      },
    });

    // لا نرجع الـ accessToken في الـ response نهائياً
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
