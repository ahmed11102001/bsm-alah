import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

// ===============================
// جلب جميع الحملات
// ===============================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    // جلب الحملات الخاصة بالمستخدم فقط لضمان الأمان
    const campaigns = await prisma.campaign.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// ===============================
// إنشاء حملة وإرسال للأرقام مباشرة
// ===============================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // استقبال البيانات المرسلة من ملف Campaigns.tsx
    const { userId, name, templateName, numbers } = await req.json();

    // التحقق من الحقول المطلوبة (استخدام numbers بدلاً من contactIds)
    if (!userId || !name || !templateName || !Array.isArray(numbers)) {
      return NextResponse.json(
        { error: "Missing required fields: name, templateName, or numbers" },
        { status: 400 }
      );
    }

    // التحقق من هوية المستخدم
    if (userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 403 });
    }

    // 1. إنشاء سجل الحملة في قاعدة البيانات
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
        status: "running", // تحديث الحالة إلى جاري الإرسال
      },
    });

    // 2. الإرسال مباشرة للأرقام (سواء من الإكسيل أو الكتابة اليدوية)
    // نستخدم حلقة loop لإرسال الرسائل عبر WhatsApp API
    const sendPromises = numbers.map(async (phone) => {
      try {
        // نمرر اسم القالب لدالة الإرسال
        return await sendMessage(userId, phone, templateName);
      } catch (sendError) {
        console.error(`خطأ في الإرسال للرقم ${phone}:`, sendError);
        return null;
      }
    });

    // انتظار انتهاء عمليات الإرسال
    await Promise.all(sendPromises);

    return NextResponse.json({ 
      success: true, 
      campaignId: campaign.id,
      message: `تم بدء إرسال الحملة لـ ${numbers.length} رقم`
    });

  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}