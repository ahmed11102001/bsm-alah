// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, CampaignStatus } from "@/types/enums";
import { getPlanStatus } from "@/lib/plan-guard";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const userId = session.user.id as string;
    const ownerId = resolveOwnerId(session);

    const [
      totalSent,
      totalDelivered,
      totalRead,
      totalInbound,
      totalCampaigns,
      totalContacts,
      recentCampaigns,
      planStatus,
      userRecord,
      whatsappAccount,
      testimonialCount,
    ] = await Promise.all([
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.outbound } }),
      prisma.message.count({ where: { userId: ownerId, status: { in: [MessageStatus.delivered, MessageStatus.read] } } }),
      prisma.message.count({ where: { userId: ownerId, status: MessageStatus.read } }),
      prisma.message.count({ where: { userId: ownerId, direction: MessageDirection.inbound } }),
      prisma.campaign.count({ where: { userId: ownerId } }),
      prisma.contact.count({ where: { userId: ownerId, deletedAt: null } }),
      prisma.campaign.findMany({
        where: { userId: ownerId },
        orderBy: { sentCount: "desc" },
        take: 3,
        select: {
          id: true, name: true, status: true,
          sentCount: true, failedCount: true, createdAt: true,
          template: { select: { name: true } },
        },
      }),
      getPlanStatus(ownerId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, image: true, role: true, password: true, onboardingCompleted: true },
      }),
      prisma.whatsAppAccount.findUnique({
        where: { userId: ownerId },
        select: { phoneNumberId: true, wabaId: true },
      }),
      prisma.testimonial.count({ where: { userId: ownerId } }),
    ]);

    if (!userRecord) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const recentCampaignIds = recentCampaigns.map(c => c.id);
    const [recentDeliveredCounts, recentReadCounts] = await Promise.all([
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: recentCampaignIds }, status: MessageStatus.delivered },
        _count: { id: true },
      }),
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: recentCampaignIds }, status: MessageStatus.read },
        _count: { id: true },
      }),
    ]);

    const recentDeliveredMap = new Map(recentDeliveredCounts.map(p => [p.campaignId!, p._count.id]));
    const recentReadMap = new Map(recentReadCounts.map(p => [p.campaignId!, p._count.id]));

    const deliveryRate = totalSent > 0 ? +((totalDelivered / totalSent) * 100).toFixed(1) : 0;
    const readRate = totalSent > 0 ? +((totalRead / totalSent) * 100).toFixed(1) : 0;
    const replyRate = totalSent > 0 ? +((totalInbound / totalSent) * 100).toFixed(1) : 0;

    return NextResponse.json({
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone,
        image: userRecord.image,
        role: userRecord.role,
        hasPassword: !!userRecord.password,
        onboardingCompleted: userRecord.onboardingCompleted ?? false,
        hasTestimonial: testimonialCount > 0,
      },
      whatsapp: session.user.role === "CHAT_ONLY" ? null : whatsappAccount,
      stats: {
        totalSent, totalDelivered, totalRead, totalInbound, totalCampaigns, totalContacts,
        deliveryRate, readRate, replyRate,
      },
      plan: {
        ...planStatus,
        aiTokens: {
          monthlyLimit: planStatus.limits.aiTokensPerMonth,
          usedThisMonth: (await prisma.subscription.findUnique({
            where: { userId: ownerId },
            select: { aiTokensUsedThisMonth: true, aiTokensBonusBalance: true },
          })) ?? { aiTokensUsedThisMonth: 0, aiTokensBonusBalance: 0 },
        },
      },
      recentCampaigns: recentCampaigns.map(c => ({
        ...c,
        deliveredCount: recentDeliveredMap.get(c.id) ?? 0,
        readCount: recentReadMap.get(c.id) ?? 0,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/dashboard:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}