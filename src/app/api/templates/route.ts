import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// جلب القوالب للعرض
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }
    const templates = await prisma.template.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(templates || []);
  } catch (error) {
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// إنشاء قالب يدوي (لو حبيت تضيف من الموقع)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { name, content } = await req.json();
    const newTemp = await prisma.template.create({
      data: {
        metaId: `local_${Date.now()}`,
        name,
        content,
        userId: session.user.id,
        status: "PENDING",
        category: "MARKETING",
        language: "ar"
      }
    });
    return NextResponse.json(newTemp);
  } catch (error) { return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 }); }
}

// حذف قالب
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const { id } = await req.json();
    await prisma.template.deleteMany({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "فشل الحذف" }, { status: 500 }); }
}