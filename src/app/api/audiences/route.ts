import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const audiences = await prisma.audience.findMany({
      where: {
        userId: (session.user as any).id,
      },
      include: {
        contacts: { take: 5 },
        _count: { select: { contacts: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(audiences);
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل تحميل الجماهير" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ جلسة غير صالحة");
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, contacts } = await req.json();

    if (!name || !contacts || !Array.isArray(contacts)) {
      console.error("❌ بيانات غير صحيحة:", { name, contacts });
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    console.log("📝 إنشاء جمهور جديد:", { name, contactCount: contacts.length });

    const newAudience = await prisma.audience.create({
      data: {
        name,
        userId: (session.user as any).id,
        contacts: {
          create: contacts
        }
      },
      include: {
        contacts: true,
        _count: { select: { contacts: true } }
      }
    });

    console.log("✅ تم إنشاء الجمهور:", newAudience.id);

    return NextResponse.json({ success: true, data: newAudience });
  } catch (error) {
    console.error("❌ خطأ في إنشاء الجمهور:", error);
    return NextResponse.json({ error: "فشل حفظ الجمهور" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "معرف الجمهور مطلوب" }, { status: 400 });
    }

    // تأكد أن الجمهور ينتمي للمستخدم
    const audience = await prisma.audience.findFirst({
      where: {
        id,
        userId: (session.user as any).id,
      },
    });

    if (!audience) {
      return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });
    }

    await prisma.audience.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل حذف الجمهور" }, { status: 500 });
  }
}