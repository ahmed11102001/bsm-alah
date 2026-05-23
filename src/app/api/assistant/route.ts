import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import prisma               from "@/lib/prisma";

// GET /api/assistant — بيجيب الـ data المحتاجة لتقييم الـ rules
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ساعة فاتت

  const [expiredChats, automationCount, lastCampaign] = await Promise.all([

    // المحادثات اللي آخر رسالة من العميل عدت عليها 24 ساعة
    // بنشوف contacts اللي lastMessageAt < cutoff  وآخر رسالة كانت inbound
    prisma.contact.count({
      where: {
        userId,
        deletedAt:   null,
        isArchived:  false,
        lastMessageAt: { lt: cutoff, not: null },
        messages: {
          some: {
            direction: "inbound",
            createdAt: { lt: cutoff },
          },
        },
      },
    }),

    // عدد الـ automation rules
    prisma.automationRule.count({ where: { userId } }),

    // آخر campaign
    prisma.campaign.findFirst({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      select:  {
        status:        true,
        sentCount:     true,
        deliveredCount:true,
        failedCount:   true,
      },
    }),
  ]);

  const lastCampaignDelivery =
    lastCampaign && lastCampaign.sentCount > 0
      ? Math.round((lastCampaign.deliveredCount / lastCampaign.sentCount) * 100)
      : undefined;

  return NextResponse.json({
    expiredChats,
    automationCount,
    lastCampaignStatus:   lastCampaign?.status ?? null,
    lastCampaignDelivery: lastCampaignDelivery ?? null,
  });
}