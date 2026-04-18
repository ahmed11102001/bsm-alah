import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: "لم يتم العثور على مستخدم" }, { status: 401 });
    }

    // 1. جلب بيانات الربط
    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId: userId }
    });

    // لو مفيش بيانات ربط، هنبعت 400 بدل ما السيرفر يضرب 500
    if (!account || !account.accessToken || !account.wabaId) {
      return NextResponse.json({ 
        success: false, 
        error: "بيانات Meta API غير موجودة في حسابك. برجاء حفظ الإعدادات أولاً." 
      }, { status: 400 });
    }

    const metaUrl = `https://graph.facebook.com/v20.0/${account.wabaId}/message_templates?limit=100`;
    
    const response = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${account.accessToken.trim()}` },
      cache: 'no-store'
    });

    const body = await response.json();

    if (body.error) {
      return NextResponse.json({ success: false, error: body.error.message }, { status: 400 });
    }

    const remoteTemplates = body.data || [];
    let syncedCount = 0;

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
            status: String(temp.status).toUpperCase(),
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
      } catch (e) {
        console.error("Upsert error for template", temp.id);
      }
    }

    return NextResponse.json({ success: true, count: syncedCount });

  } catch (error: any) {
    console.error("Critical Sync Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}