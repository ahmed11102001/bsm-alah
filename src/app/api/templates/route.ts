import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 1. وظيفة الجلب (GET)
export async function GET() {
  try {
    console.log("📋 [GET] Fetching templates...");
    
    const session = await getServerSession(authOptions);
    
    console.log("🔍 [GET] Session check:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasId: !!session?.user?.id,
      userId: session?.user?.id
    });

    // تأكد من وجود الـ session و user ID
    if (!session?.user?.id) {
      console.error("❌ [AUTH] Unauthorized - No session or user ID");
      return NextResponse.json(
        { error: "غير مصرح لك - سجل دخولك أولاً" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log("✅ [AUTH] User authenticated:", userId);

    // جلب القوالب من DB
    const templates = await prisma.template.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" }
    });

    console.log(`✅ [DB] Found ${templates.length} templates`);
    return NextResponse.json(templates || []);

  } catch (error: any) {
    console.error("❌ [ERROR] GET /templates:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ في السيرفر", details: error.message },
      { status: 500 }
    );
  }
}

// 2. وظيفة الإنشاء (POST)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { name, content, language = "ar", category = "marketing", status = "pending" } = await req.json();

    if (!name || !content) {
      return NextResponse.json({ error: "الاسم والمحتوى مطلوبان" }, { status: 400 });
    }

    const userId = session.user.id;

    const newTemplate = await prisma.template.create({
      data: {
        metaId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
        name,
        content,
        language,
        category,
        status,
        userId: userId,
      }
    });

    return NextResponse.json(newTemplate);
  } catch (error: any) {
    console.error("❌ خطأ في إنشاء القالب:", error);
    return NextResponse.json(
      { error: error.message || "فشل حفظ القالب" },
      { status: 500 }
    );
  }
}

// 3. وظيفة الحذف (DELETE)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id } = await req.json();
    const userId = session.user.id;

    // حذف القالب مع التأكد من ملكيته للمستخدم في خطوة واحدة
    const deleteResult = await prisma.template.deleteMany({
      where: { 
        id: id,
        userId: userId 
      }
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: "القالب غير موجود أو لا تملك صلاحية حذفه" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ خطأ في حذف القالب:", error);
    return NextResponse.json({ error: "فشل حذف القالب" }, { status: 500 });
  }
}