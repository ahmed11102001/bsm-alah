import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 1. وظيفة الجلب (GET): تقرأ فقط من قاعدة البيانات لضمان السرعة
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // جلب القوالب الخاصة بالمستخدم الحالي فقط من قاعدة البيانات
    const templates = await prisma.template.findMany({
      where: {
        userId: userId,
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(Array.isArray(templates) ? templates : []);
  } catch (error) {
    console.error("❌ خطأ في جلب القوالب:", error);
    return NextResponse.json(
      { error: "فشل تحميل القوالب" },
      { status: 500 }
    );
  }
}

// 2. وظيفة الإنشاء (POST): تستخدم عند إنشاء قالب يدوي (يجب إضافة metaId وهمي أو تركه للـ Sync)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, content, language = "ar", category = "marketing", status = "pending" } = await req.json();

    if (!name || !content) {
      return NextResponse.json({ error: "الاسم والمحتوى مطلوبان" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    const newTemplate = await prisma.template.create({
      data: {
        metaId: `local_${Date.now()}`, // إضافة معرف فريد محلي لتجنب خطأ الـ Schema
        name,
        content,
        language,
        category,
        status,
        userId: userId,
      }
    });

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("❌ خطأ في إنشاء القالب:", error);
    return NextResponse.json(
      { error: "فشل حفظ القالب" },
      { status: 500 }
    );
  }
}

// 3. وظيفة الحذف (DELETE)
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

    const userId = (session.user as any).id;

    // تأكد أن القالب ينتمي للمستخدم قبل الحذف
    const template = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!template) {
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    }

    await prisma.template.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ خطأ في حذف القالب:", error);
    return NextResponse.json(
      { error: "فشل حذف القالب" },
      { status: 500 }
    );
  }
}