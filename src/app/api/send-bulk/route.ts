import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth"; // تأكد من مسار الـ auth عندك
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const userId = session.user.id;

    const {
      numbers,
      templateName = "welcome_message",
      campaignName,
      scheduled,
    } = await req.json();

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json(
        { error: "يرجى إرسال مصفوفة أرقام صحيحة" },
        { status: 400 }
      );
    }

    // جلب بيانات واتساب الخاصة بالمستخدم
    const account = await prisma.whatsAppAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "قم بربط حساب واتساب أولاً من صفحة API" },
        { status: 400 }
      );
    }

    // تنظيف الرقم
    const cleanNumber = (value: string) => {
      let cleaned = value.toString().replace(/\D/g, "");
      if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
      if (!cleaned.startsWith("20") && cleaned.length === 10) cleaned = "20" + cleaned;
      return cleaned;
    };

    // 1. إنشاء حملة
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName || "حملة جديدة",
        status: scheduled ? "scheduled" : "running",
        userId,
      },
    });

    // 2. إنشاء قائمة تلقائية
    const autoAudience = await prisma.audience.create({
      data: {
        name: `Auto-generated-${campaign.id}`,
        userId,
      },
    });

    const sendWithRetry = async (number: string, retries = 3) => {
      let lastError: any = null;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v19.0/${account.phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: number,
                type: "template",
                template: {
                  name: templateName,
                  language: { code: "ar" },
                },
              }),
            }
          );

          const data = await response.json();

          if (response.ok) {
            // التعديل الجوهري هنا: استخدام phone_audienceId
            const contact = await prisma.contact.upsert({
              where: {
                phone_audienceId: {
                  phone: number,
                  audienceId: autoAudience.id,
                },
              },
              update: { name: "جهة اتصال محدثة" },
              create: {
                phone: number,
                userId,
                audienceId: autoAudience.id,
              },
            });

            await prisma.message.create({
              data: {
                content: `Template: ${templateName}`,
                type: "template",
                status: "sent",
                userId,
                campaignId: campaign.id,
                contactId: contact.id,
                whatsappId: data.messages?.[0]?.id,
                sentAt: new Date(),
              },
            });

            return { success: true };
          }
          lastError = data;
        } catch (error) {
          lastError = error;
        }
      }

      // في حالة الفشل النهائي
      const failedContact = await prisma.contact.upsert({
        where: {
          phone_audienceId: {
            phone: number,
            audienceId: autoAudience.id,
          },
        },
        update: {},
        create: {
          phone: number,
          userId,
          audienceId: autoAudience.id,
        },
      });

      await prisma.message.create({
        data: {
          content: `Template: ${templateName}`,
          type: "template",
          status: "failed",
          userId,
          campaignId: campaign.id,
          contactId: failedContact.id,
          error: JSON.stringify(lastError),
        },
      });

      return { success: false, error: lastError };
    };

    const results = [];
    for (const item of numbers) {
      const cleaned = cleanNumber(item);
      if (cleaned) {
        const result = await sendWithRetry(cleaned);
        results.push({ number: cleaned, ...result });
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        sentCount,
        failedCount,
        status: scheduled ? "scheduled" : sentCount > 0 ? "completed" : "failed",
        completedAt: scheduled ? null : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      summary: { total: numbers.length, sent: sentCount, failed: failedCount },
      results,
    });
  } catch (error) {
    console.error("❌ Send Bulk Error:", error);
    return NextResponse.json({ error: "فشل إرسال الحملة" }, { status: 500 });
  }
}