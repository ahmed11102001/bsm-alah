import { NextRequest, NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function resolveOwnerId(session: any): string {
  if (session.user.role === "OWNER") return session.user.id as string;
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAppServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const ownerId = resolveOwnerId(session);
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const campaignId = searchParams.get("campaignId");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));

    const where: any = {
      campaign: {
        userId: ownerId,
      },
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam;
    }

    if (campaignId && campaignId !== "ALL") {
      where.campaignId = campaignId;
    }

    if (search) {
      where.OR = [
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, deliveries, userCampaigns] = await Promise.all([
      prisma.emailDelivery.count({ where }),
      prisma.emailDelivery.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              subject: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailCampaign.findMany({
        where: { userId: ownerId },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const items = deliveries.map((d) => ({
      id: d.id,
      campaignId: d.campaignId,
      // إرسالات الأتمتة (عيد ميلاد/بعد الاستلام/...) ملهاش حملة
      campaignName: d.campaign?.name ?? "أتمتة تلقائية",
      subject: d.campaign?.subject ?? "—",
      contactEmail: d.contactEmail,
      contactName: d.contactName,
      status: d.status,
      errorMessage: d.errorMessage,
      sentAt: d.sentAt?.toISOString() || null,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      campaigns: userCampaigns,
    });
  } catch (err: any) {
    console.error("[api/email/activity GET]:", err);
    return NextResponse.json({ error: "فشل جلب سجل نشاط البريد" }, { status: 500 });
  }
}
