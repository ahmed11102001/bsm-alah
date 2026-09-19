import { NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { emailEligibilityWhere } from "@/lib/email-marketing/eligibility";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET() {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);

    const [
      totalContacts,
      subscribedContacts,
      totalCampaigns,
      campaignsStats,
      connection,
      recentCampaigns,
      recentDeliveries,
    ] = await Promise.all([
      prisma.contact.count({ where: { userId: ownerId, email: { not: null } } }),
      prisma.contact.count({ where: emailEligibilityWhere(ownerId) }),
      prisma.emailCampaign.count({ where: { userId: ownerId } }),
      prisma.emailCampaign.aggregate({
        where: { userId: ownerId },
        _sum: {
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
        },
      }),
      prisma.emailConnection.findUnique({
        where: { userId: ownerId },
        select: { fromEmail: true, host: true, lastTestSuccess: true, lastTestedAt: true },
      }),
      prisma.emailCampaign.findMany({
        where: { userId: ownerId },
        include: { template: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.emailDelivery.findMany({
        where: { campaign: { userId: ownerId } },
        include: { campaign: { select: { name: true, subject: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const sent = campaignsStats._sum.sentCount || 0;
    const delivered = campaignsStats._sum.deliveredCount || 0;
    const failed = campaignsStats._sum.failedCount || 0;
    const acceptanceRate = sent > 0 ? +((delivered / sent) * 100).toFixed(1) : 100;

    return NextResponse.json({
      stats: {
        totalContacts,
        subscribedContacts,
        unsubscribedContacts: totalContacts - subscribedContacts,
        totalCampaigns,
        totalEmailsSent: sent,
        acceptedEmails: delivered,
        failedEmails: failed,
        deliveryRate: acceptanceRate,
        openRate: null, // Generic SMTP does not track opens without tracking proxy
        isSmtpConfigured: Boolean(connection?.host),
        fromEmail: connection?.fromEmail || null,
        host: connection?.host || null,
        lastTestSuccess: connection?.lastTestSuccess || null,
      },
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        templateName: c.template?.name,
        targetTag: c.targetTag,
        targetCount: c.targetCount,
        sentCount: c.sentCount,
        deliveredCount: c.deliveredCount,
        failedCount: c.failedCount,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      recentActivity: recentDeliveries.map((d) => ({
        id: d.id,
        campaignName: d.campaign?.name ?? "أتمتة تلقائية",
        subject: d.campaign?.subject ?? "—",
        contactEmail: d.contactEmail,
        contactName: d.contactName,
        status: d.status,
        errorMessage: d.errorMessage,
        sentAt: d.sentAt?.toISOString() || null,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("[api/email/overview GET]:", err);
    return NextResponse.json({ error: "فشل جلب إحصائيات البريد" }, { status: 500 });
  }
}
