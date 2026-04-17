import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "لم يتم العثور على الجلسة" }, { status: 401 });
    }

    // تنظيف المتغيرات
    const accessToken = (process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_ACCESS_TOKEN)?.trim();
    const wabaId = (process.env.WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID)?.trim();

    if (!accessToken || !wabaId) {
      return NextResponse.json({ success: false, error: "بيانات Meta API ناقصة" }, { status: 500 });
    }

    // جلب البيانات من ميتا - اللينك الخام اللي اشتغل معاك
    const metaUrl = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=100`;
    const response = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });

    const body = await response.json();
    const remoteTemplates = body.data || [];

    console.log(`[SYNC] Meta returned ${remoteTemplates.length} templates for user ${userId}`);

    let syncedCount = 0;

    for (const temp of remoteTemplates) {
      try {
        const bodyComp = temp.components?.find((c: any) => c.type === "BODY");
        
        // تحويل كل المعرفات لسلسلة نصية (String) لضمان التوافق مع Schema بريزما
        const templateMetaId = String(temp.id);
        const currentUserId = String(userId);

        await prisma.template.upsert({
          where: {
            // هنا بنستخدم الـ Composite Unique Key اللي في الـ Schema بتاعتك
            metaId_userId: {
              metaId: templateMetaId,
              userId: currentUserId,
            },
          },
          update: {
            name: String(temp.name),
            status: String(temp.status).toLowerCase(),
            category: String(temp.category).toLowerCase(),
            language: String(temp.language),
            content: bodyComp?.text || "No content",
          },
          create: {
            metaId: templateMetaId,
            name: String(temp.name),
            status: String(temp.status).toLowerCase(),
            category: String(temp.category).toLowerCase(),
            language: String(temp.language),
            content: bodyComp?.text || "No content",
            userId: currentUserId,
          },
        });
        syncedCount++;
      } catch (upsertError: any) {
        console.error(`❌ Upsert Failed for template ${temp.id}:`, upsertError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `تمت مزامنة ${syncedCount} قالب` 
    });

  } catch (error: any) {
    console.error("❌ Critical Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}