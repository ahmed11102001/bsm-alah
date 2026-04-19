import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";
import { MessageDirection, MessageStatus, MessageType, CampaignStatus } from "@prisma/client";

// ===============================
// جلب جميع الحملات
// ===============================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        template: true, // تأكد من تضمين القالب ليعرض الاسم في الواجهة 
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
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

    const { userId, name, templateName, numbers } = await req.json();

    if (!userId || !name || !templateName || !Array.isArray(numbers)) {
      return NextResponse.json(
        { error: "Missing required fields: name, templateName, or numbers" },
        { status: 400 }
      );
    }

    // 1. البحث عن القالب لربطه بالحملة
    const template = await prisma.template.findFirst({
      where: { name: templateName, userId }
    });

    // 2. إنشاء سجل الحملة
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
        templateId: template?.id, // ربط القالب 
        status: CampaignStatus.running,
      },
    });

    // 3. معالجة الإرسال وتحديث السجلات
    const results = await Promise.all(
      numbers.map(async (phone) => {
        try {
          // أ. تحديث أو إنشاء جهة الاتصال لضمان ظهورها في الشات [cite: 8]
          const contact = await prisma.contact.upsert({
            where: { phone_userId: { phone, userId } },
            update: { lastMessageAt: new Date() }, // تحديث التاريخ ليظهر في قائمة المحادثات 
            create: { phone, userId, lastMessageAt: new Date() },
          });

          // ب. إرسال الرسالة عبر WhatsApp API
          const response = await sendMessage(userId, phone, templateName);

          // ج. تسجيل الرسالة في جدول الرسائل لتظهر داخل الشات فوراً 
          await prisma.message.create({
            data: {
              content: `Campaign: ${name} (Template: ${templateName})`,
              type: MessageType.template,
              direction: MessageDirection.outbound,
              status: MessageStatus.sent,
              userId,
              contactId: contact.id,
              campaignId: campaign.id,
              whatsappId: (response as any)?.messages?.[0]?.id, // حفظ معرف واتساب للمتابعة [cite: 15]
            },
          });

          return { success: true };
        } catch (error) {
          console.error(`Error sending to ${phone}:`, error);
          return { success: false };
        }
      })
    );

    // 4. تحديث حالة الحملة النهائية والإحصائيات 
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.length - sentCount;

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.completed,
        sentCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      message: `تم معالجة ${numbers.length} رقم (ناجح: ${sentCount}, فشل: ${failedCount})`
    });

  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}