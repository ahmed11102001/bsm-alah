import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const templates = await prisma.template.findMany({
      where: {
        userId: (session.user as any).id,
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل تحميل القوالب" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, content } = await req.json();

    if (!name || !content) {
      return NextResponse.json({ error: "الاسم والمحتوى مطلوبان" }, { status: 400 });
    }

    const newTemplate = await prisma.template.create({
      data: {
        name,
        content,
        userId: (session.user as any).id,
        user: {
          connect: { id: (session.user as any).id }
        }
      }
    });

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل حفظ القالب" }, { status: 500 });
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
      return NextResponse.json({ error: "معرف القالب مطلوب" }, { status: 400 });
    }

    // تأكد أن القالب ينتمي للمستخدم
    const template = await prisma.template.findFirst({
      where: {
        id,
        userId: (session.user as any).id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    }

    await prisma.template.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ error: "فشل حذف القالب" }, { status: 500 });
  }
}