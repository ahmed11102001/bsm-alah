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
  const ownerId = session.user.parentId ?? userId;
  const isChatOnly = session.user.role === "CHAT_ONLY";
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ساعة فاتت

  // Team members don't own the WhatsApp workspace. Their assistant is intentionally
  // limited to the 24h conversation warning, so never evaluate/return owner-level
  // setup, campaign, automation, or WhatsApp-connection advice for them.
  const expiredChats = await prisma.contact.count({
    where: {
      userId: ownerId,
      deletedAt: null,
      isArchived: false,
      lastMessageAt: { lt: cutoff, not: null },
      messages: {
        some: {
          direction: "inbound",
          createdAt: { lt: cutoff },
        },
      },
    },
  });

  if (isChatOnly) {
    return NextResponse.json({
      role: "CHAT_ONLY",
      expiredChats,
    });
  }

  const [automationCount, lastCampaign, whatsappAccount] = await Promise.all([
    // كل بيانات الـ assistant للـ Owner / Full Access تُقرأ من Workspace Owner.
    prisma.automationRule.count({ where: { userId: ownerId } }),
    prisma.campaign.findFirst({
      where: { userId: ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
      },
    }),
    prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: { phoneNumberId: true, wabaId: true },
    }),
  ]);

  const lastCampaignDelivery =
    lastCampaign && lastCampaign.sentCount > 0
      ? Math.round((lastCampaign.deliveredCount / lastCampaign.sentCount) * 100)
      : undefined;

  return NextResponse.json({
    role: session.user.role,
    whatsappConnected: !!whatsappAccount?.phoneNumberId && !!whatsappAccount?.wabaId,
    expiredChats,
    automationCount,
    lastCampaignStatus: lastCampaign?.status ?? null,
    lastCampaignDelivery: lastCampaignDelivery ?? null,
  });
}
