import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Endpoint تشخيص مؤقت - يمكن إزالته لاحقاً
export async function PATCH() {
  console.log("🔧 [DIAG] تم استدعاء PATCH /api/templates");
  try {
    console.log("🔧 [DIAG] فحص قاعدة البيانات...");

    // فحص عدد القوالب الكلي
    const totalCount = await prisma.template.count();
    console.log("🔧 [DIAG] إجمالي القوالب في DB:", totalCount);

    // فحص أول 3 قوالب
    const sampleTemplates = await prisma.template.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        userId: true,
        status: true,
        createdAt: true
      }
    });
    console.log("🔧 [DIAG] عينة من القوالب:", sampleTemplates);

    // فحص المستخدمين
    const users = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    console.log("🔧 [DIAG] المستخدمون:", users);

    // إذا لم يوجد مستخدمين، أنشئ مستخدم تجريبي
    if (users.length === 0) {
      console.log("🔧 [DIAG] لا يوجد مستخدمون، جاري إنشاء مستخدم تجريبي...");
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("123456", 10);

      const testUser = await prisma.user.create({
        data: {
          email: "test@example.com",
          name: "مستخدم تجريبي",
          password: hashedPassword,
        }
      });
      console.log("✅ تم إنشاء مستخدم تجريبي:", testUser.id);

      // أعد فحص المستخدمين
      const updatedUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          email: true,
          name: true
        }
      });
      console.log("🔧 [DIAG] المستخدمون بعد الإنشاء:", updatedUsers);
    }

    return NextResponse.json({
      totalTemplates: totalCount,
      sampleTemplates,
      users,
      database: "connected"
    });
  } catch (error) {
    console.error("❌ خطأ في التشخيص:", error);
    return NextResponse.json(
      { error: "فشل التشخيص", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log("🔍 [DEBUG] بدء GET /api/templates");

    const session = await getServerSession(authOptions);
    console.log("🔍 [DEBUG] Session:", JSON.stringify(session, null, 2));

    if (!session || !session.user) {
      console.error("❌ جلسة غير صالحة في GET /api/templates");
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log("🔍 [DEBUG] User ID من session:", userId);
    console.log("🔍 [DEBUG] نوع User ID:", typeof userId);

    if (!userId) {
      console.error("❌ User ID مفقود من session!");
      return NextResponse.json({ error: "معرف المستخدم مفقود" }, { status: 400 });
    }

    console.log("📥 جاري جلب القوالب للمستخدم:", userId);

    // أولاً، جرب استعلام بدون فلترة للتأكد من وجود بيانات
    const allTemplates = await prisma.template.findMany({
      take: 5, // خذ أول 5 فقط للاختبار
    });
    console.log("🔍 [DEBUG] جميع القوالب (أول 5):", allTemplates.length, "قالب");
    console.log("🔍 [DEBUG] عينة من البيانات:", allTemplates.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name,
      userId: t.userId,
      status: t.status
    })));

    // الآن الاستعلام المفلتر
    const templates = await prisma.template.findMany({
      where: {
        userId: userId,
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("✅ تم جلب", templates.length, "قالب للمستخدم", userId);
    console.log("🔍 [DEBUG] القوالب المفلترة:", templates.map(t => ({
      id: t.id,
      name: t.name,
      userId: t.userId
    })));

    // إذا لم توجد قوالب، أضف قالب تجريبي مؤقت
    if (templates.length === 0) {
      console.log("🔧 [DEBUG] لا توجد قوالب للمستخدم، جاري إنشاء قالب تجريبي...");
      try {
        const testTemplate = await prisma.template.create({
          data: {
            name: "قالب تجريبي",
            content: "مرحباً {name}، هذا قالب تجريبي من النظام",
            status: "approved",
            language: "ar",
            category: "marketing",
            userId: userId,
          }
        });
        console.log("✅ تم إنشاء قالب تجريبي:", testTemplate.id);
        return NextResponse.json([testTemplate]);
      } catch (createError) {
        console.error("❌ فشل إنشاء قالب تجريبي:", createError);
        // إذا فشل الإنشاء، أعد []
        return NextResponse.json([]);
      }
    }

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