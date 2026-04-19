import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
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

    const rawUserId = (session.user as any).id;
    const parentId = (session.user as any).parentId;
    const userId = parentId ?? rawUserId;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
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

    const body = await req.json();
    const { name, templateName, numbers } = body;

    const rawUserId = (session.user as any).id;
    const parentId = (session.user as any).parentId;
    const userId = parentId ?? rawUserId;

    if (!name || !templateName || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: name, templateName, or numbers" },
        { status: 400 }
      );
    }

    // البحث عن حساب واتساب
    const whatsappAccount = await prisma.whatsAppAccount.findUnique({
      where: { userId },
    });

    if (!whatsappAccount) {
      return NextResponse.json(
        { error: "WhatsApp account not connected" },
        { status: 400 }
      );
    }

    // البحث عن القالب
    const template = await prisma.template.findFirst({
      where: { name: templateName, userId },
    });

    if (!template) {
      return NextResponse.json(
        { error: `Template "${templateName}" not found` },
        { status: 404 }
      );
    }

    // إنشاء سجل الحملة
    const campaign = await prisma.campaign.create({
      data: {
        name,
        userId,
        templateId: template.id,
        status: CampaignStatus.running,
        startedAt: new Date(),
      },
    });

    // معالجة الإرسال
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of numbers) {
      try {
        // تحديث أو إنشاء جهة الاتصال
        const contact = await prisma.contact.upsert({
          where: { phone_userId: { phone, userId } },
          update: { lastMessageAt: new Date() },
          create: { phone, userId, lastMessageAt: new Date() },
        });

        // إرسال الرسالة عبر WhatsApp API
        const payload = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "ar" },
          },
        };

        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${whatsappAccount.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappAccount.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const meta = await metaRes.json();

        if (meta.error) {
          throw new Error(meta.error.message);
        }

        // تسجيل الرسالة في قاعدة البيانات
        await prisma.message.create({
          data: {
            content: `Campaign: ${name} (Template: ${templateName})`,
            type: MessageType.template,
            direction: MessageDirection.outbound,
            status: MessageStatus.sent,
            userId,
            contactId: contact.id,
            campaignId: campaign.id,
            whatsappId: meta.messages?.[0]?.id,
            sentAt: new Date(),
          },
        });

        sentCount++;
      } catch (error) {
        console.error(`Error sending to ${phone}:`, error);
        failedCount++;
      }
    }

    // تحديث حالة الحملة النهائية
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
      sentCount,
      failedCount,
      total: numbers.length,
    });
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}