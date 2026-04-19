import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { accessToken, phoneNumberId, wabaId } = await req.json();

    if (!accessToken || !phoneNumberId || !wabaId) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    // حفظ أو تحديث بيانات واتساب الخاص باليوزر
    const account = await prisma.whatsAppAccount.upsert({
      where: { userId: (session.user as any).id },
      update: {
        accessToken,
        phoneNumberId,
        wabaId,
      },
      create: {
        userId: (session.user as any).id,
        accessToken,
        phoneNumberId,
        wabaId,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}