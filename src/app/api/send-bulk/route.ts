import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { numbers, templateName = "welcome_message", campaignName, scheduled } = await req.json();

    // ✅ التحقق من صحة البيانات
    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ error: "يرجى إرسال مصفوفة أرقام صحيحة" }, { status: 400 });
    }

    if (numbers.length === 0) {
      return NextResponse.json({ error: "لا توجد أرقام للإرسال" }, { status: 400 });
    }

    // ✅ 2. دالة تنظيف الرقم
    const cleanNumber = (number: string) => {
      let cleaned = number.toString().replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1);
      if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
      return cleaned;
    };

    const userId = (session.user as any).id as string;

    // ✅ إنشاء الحملة في قاعدة البيانات
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName || "حملة جديدة",
        status: scheduled ? "scheduled" : "running",
        userId,
        user: {
          connect: { id: userId }
        },
        scheduledAt: scheduled ? new Date(scheduled) : null,
      }
    });

    const autoAudience = await prisma.audience.create({
      data: {
        name: `Auto-generated-${campaign.id}`,
        userId,
        user: {
          connect: { id: userId }
        }
      }
    });

    // ✅ دالة إرسال الرسالة مع إعادة المحاولة
    const sendWithRetry = async (number: string, retries = 3) => {
      let lastError = null;

      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch("https://graph.facebook.com/v19.0/979565035250717/messages", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.WHATSAPP_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: number,
              type: "template",
              template: {
                name: templateName,
                language: { code: "ar" }
              }
            })
          });

          const data = await response.json();

          if (response.ok) {
            // ✅ نجح الإرسال
            await prisma.message.create({
              data: {
                content: `Template: ${templateName}`,
                status: "sent",
                userId,
                campaignId: campaign.id,
                contact: {
                  connectOrCreate: {
                    where: {
                      phone_audienceId: {
                        phone: number,
                        audienceId: autoAudience.id,
                      }
                    },
                    create: {
                      phone: number,
                      audienceId: autoAudience.id,
                    }
                  }
                },
                whatsappId: data.messages?.[0]?.id,
                sentAt: new Date(),
              }
            });

            return { success: true, data };
          } else {
            lastError = data;
          }
        } catch (error) {
          lastError = error;
        }
      }

      // ❌ فشل بعد جميع المحاولات
      await prisma.message.create({
        data: {
          content: `Template: ${templateName}`,
          status: "failed",
          userId,
          campaignId: campaign.id,
          contact: {
            connectOrCreate: {
              where: {
                phone_audienceId: {
                  phone: number,
                  audienceId: autoAudience.id,
                }
              },
              create: {
                phone: number,
                audienceId: autoAudience.id,
              }
            }
          },
          error: JSON.stringify(lastError),
        }
      });

      return { success: false, error: lastError };
    };

    // ✅ إرسال الرسائل
    const results = [];
    for (const number of numbers) {
      const cleaned = cleanNumber(number);
      if (cleaned) {
        const result = await sendWithRetry(cleaned);
        results.push({ number: cleaned, ...result });
      }
    }

    // ✅ تحديث إحصائيات الحملة
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        sentCount,
        failedCount,
        status: scheduled ? "scheduled" : (sentCount > 0 ? "completed" : "failed"),
        completedAt: scheduled ? null : new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      results,
      summary: {
        total: numbers.length,
        sent: sentCount,
        failed: failedCount
      }
    });

  } catch (error) {
    console.error("❌ Send Bulk Error:", error);
    return NextResponse.json({ error: "فشل إرسال الحملة" }, { status: 500 });
  }
}