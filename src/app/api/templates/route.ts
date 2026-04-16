import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ جلسة غير صالحة في GET /api/templates");
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    console.log("📥 جاري جلب القوالب للمستخدم:", (session.user as any).id);

    const templates = await prisma.template.findMany({
      where: {
        userId: (session.user as any).id,
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("✅ تم جلب", templates.length, "قالب");

    // تأكد من أن الاستجابة دائماً array
    return NextResponse.json(Array.isArray(templates) ? templates : []);
  } catch (error) {
    console.error("❌ خطأ في جلب القوالب:", error);
    return NextResponse.json(
      { error: "فشل تحميل القوالب", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ جلسة غير صالحة في POST /api/templates");
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, content, language = "ar", category = "marketing", status = "pending" } = await req.json();

    if (!name || !content) {
      console.error("❌ بيانات غير صحيحة:", { name, content });
      return NextResponse.json({ error: "الاسم والمحتوى مطلوبان" }, { status: 400 });
    }

    console.log("📝 إنشاء قالب جديد:", { name, language, category });

    const newTemplate = await prisma.template.create({
      data: {
        name,
        content,
        language,
        category,
        status,
        userId: (session.user as any).id,
      }
    });

    console.log("✅ تم إنشاء القالب:", newTemplate.id);

    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("❌ خطأ في إنشاء القالب:", error);
    return NextResponse.json(
      { error: "فشل حفظ القالب", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ جلسة غير صالحة في DELETE /api/templates");
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      console.error("❌ معرف القالب مفقود");
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
      console.error("❌ القالب غير موجود:", id);
      return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
    }

    console.log("🗑️ حذف القالب:", id);

    await prisma.template.delete({
      where: { id }
    });

    console.log("✅ تم حذف القالب بنجاح");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ خطأ في حذف القالب:", error);
    return NextResponse.json(
      { error: "فشل حذف القالب", details: String(error) },
      { status: 500 }
    );
  }
}