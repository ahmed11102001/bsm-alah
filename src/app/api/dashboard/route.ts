// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, CampaignStatus } from "@prisma/client";
import { getPlanStatus } from "@/lib/plan-guard";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const userId  = session.user.id as string;
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
    ] = await Promise.all([
      // إجمالي الرسائل المرسلة
      prisma.message.count({
        where: { userId: ownerId, direction: MessageDirection.outbound, deletedAt: null },
      }),
      // إجمالي المستلمة
      prisma.message.count({
        where: { userId: ownerId, status: MessageStatus.delivered, deletedAt: null },
      }),
      // إجمالي المقروءة
      prisma.message.count({
        where: { userId: ownerId, status: MessageStatus.read, deletedAt: null },
      }),
      // إجمالي الردود الواردة
      prisma.message.count({
        where: { userId: ownerId, direction: MessageDirection.inbound, deletedAt: null },
      }),
      // إجمالي الحملات
      prisma.campaign.count({ where: { userId: ownerId } }),
      // إجمالي جهات الاتصال
      prisma.contact.count({ where: { userId: ownerId, deletedAt: null } }),
      // آخر 5 حملات
      prisma.campaign.findMany({
        where:   { userId: ownerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, name: true, status: true,
          sentCount: true, deliveredCount: true,
          readCount: true, failedCount: true, createdAt: true,
          template: { select: { name: true } },
        },
      }),
      // حالة الباقة
      getPlanStatus(ownerId),
      // بيانات المستخدم
      prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, name: true, email: true, phone: true, image: true, role: true },
      }),
      // حساب واتساب
      prisma.whatsAppAccount.findUnique({
        where:  { userId: ownerId },
        select: { phoneNumberId: true, wabaId: true },
      }),
    ]);

    const deliveryRate = totalSent > 0
      ? +((totalDelivered / totalSent) * 100).toFixed(1) : 0;
    const readRate = totalSent > 0
      ? +((totalRead / totalSent) * 100).toFixed(1) : 0;
    const replyRate = totalSent > 0
      ? +((totalInbound / totalSent) * 100).toFixed(1) : 0;

    return NextResponse.json({
      user: userRecord,
      whatsapp: whatsappAccount,
      stats: {
        totalSent,
        totalDelivered,
        totalRead,
        totalInbound,
        totalCampaigns,
        totalContacts,
        deliveryRate,
        readRate,
        replyRate,
      },
      plan: planStatus,
      recentCampaigns: recentCampaigns.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/dashboard:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}