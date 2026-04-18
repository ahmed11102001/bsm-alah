import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. جلب بيانات الربط الخاصة باليوزر من الداتابيز وليس من .env
    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId: userId }
    });

    if (!account || !account.accessToken || !account.wabaId) {
      return NextResponse.json({ 
        success: false, 
        error: "برجاء ضبط إعدادات Meta API أولاً من صفحة الإعدادات" 
      }, { status: 400 });
    }

    // 2. طلب البيانات من ميتا باستخدام بيانات اليوزر الخاصة
    const metaUrl = `https://graph.facebook.com/v20.0/${account.wabaId}/message_templates?limit=100`;
    const response = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
      cache: 'no-store'
    });

    const body = await response.json();

    if (body.error) {
      return NextResponse.json({ success: false, error: body.error.message }, { status: 400 });
    }

    const remoteTemplates = body.data || [];
    let syncedCount = 0;

    // 3. المزامنة مع الداتابيز
    for (const temp of remoteTemplates) {
      try {
        const bodyComp = temp.components?.find((c: any) => c.type === "BODY");
        
        await prisma.template.upsert({
          where: {
            metaId_userId: {
              metaId: String(temp.id),
              userId: userId,
            },
          },
          update: {
            name: String(temp.name),
            status: String(temp.status).toUpperCase(), // توحيد الحروف الكبيرة
            category: String(temp.category),
            language: String(temp.language),
            content: bodyComp?.text || "No content",
          },
          create: {
            metaId: String(temp.id),
            name: String(temp.name),
            status: String(temp.status).toUpperCase(),
            category: String(temp.category),
            language: String(temp.language),
            content: bodyComp?.text || "No content",
            userId: userId,
          },
        });
        syncedCount++;
      } catch (upsertError: any) {
        console.error(`❌ فشل مزامنة قالب ${temp.id}:`, upsertError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `تمت مزامنة ${syncedCount} قالب بنجاح` 
    });

  } catch (error: any) {
    console.error("❌ Critical Sync Error:", error.message);
    return NextResponse.json({ success: false, error: "حدث خطأ داخلي أثناء المزامنة" }, { status: 500 });
  }
}