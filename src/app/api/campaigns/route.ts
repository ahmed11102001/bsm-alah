// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageStatus, QueueStatus } from "@/types/enums";
import { requirePermission } from "@/lib/permissions";
import { createCampaignForUser, repeatCampaignForUser } from "@/lib/campaigns-actions";
function resolveUserId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET /api/campaigns ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "CAMPAIGNS_VIEW");
    if (denied) return denied;

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);

    const where: any = { userId };
    if (status && status !== "all") where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [rawCampaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: { select: { name: true, content: true, category: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    // ── احسب totalQueued + queuedCount + deliveredCount + readCount لكل حملة ──
    const campaignIds = rawCampaigns.map(c => c.id);

    const [
      totalQueueCounts,
      pendingCounts,
      deliveredCounts,
      readCounts,
    ] = await Promise.all([
      prisma.messageQueue.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds } },
        _count: { id: true },
      }),
      prisma.messageQueue.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: QueueStatus.pending },
        _count: { id: true },
      }),
      // ✅ deliveredCount من Message table مباشرة — نفس منطق صفحة التقارير
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: MessageStatus.delivered },
        _count: { id: true },
      }),
      // ✅ readCount من Message table مباشرة — نفس منطق صفحة التقارير
      prisma.message.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, status: MessageStatus.read },
        _count: { id: true },
      }),
    ]);

    const totalMap = new Map(
      totalQueueCounts.map(p => [p.campaignId, p._count.id])
    );

    const pendingMap = new Map(
      pendingCounts.map(p => [p.campaignId, p._count.id])
    );

    const deliveredMap = new Map(
      deliveredCounts.map(p => [p.campaignId!, p._count.id])
    );

    const readMap = new Map(
      readCounts.map(p => [p.campaignId!, p._count.id])
    );

    // ── شكّل الـ response بكل البيانات الحقيقية ──────────────────────────────
    const campaigns = rawCampaigns.map(c => {
      const totalQueued = totalMap.get(c.id) ?? 0;
      const queuedCount = pendingMap.get(c.id) ?? 0;
      const deliveredCount = deliveredMap.get(c.id) ?? 0;  // ✅ من Message table
      const readCount = readMap.get(c.id) ?? 0;  // ✅ من Message table

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        sentCount: c.sentCount,
        deliveredCount,                                       // ✅ من Message table
        readCount,                                            // ✅ من Message table
        failedCount: c.failedCount,
        totalQueued,
        queuedCount,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        completedAt: c.completedAt,
        template: c.template,
      };
    });

    return NextResponse.json({ campaigns, total, page, limit });
  } catch (err) {
    console.error("GET /api/campaigns:", err);
    return NextResponse.json({ error: "فشل في جلب الحملات" }, { status: 500 });
  }
}

// ─── POST /api/campaigns ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "CAMPAIGNS_MANAGE");
    if (denied) return denied;

    const userId = resolveUserId(session);
    const body = await req.json();

    if (body._action === "repeat" && body.campaignId)
      return await repeatCampaignForUser(userId, body.campaignId);

    return await createCampaignForUser(userId, body);
  } catch (err: any) {
    console.error("POST /api/campaigns:", err);
    return NextResponse.json({ error: err.message ?? "خطأ في السيرفر" }, { status: 500 });
  }
}

// ─── DELETE /api/campaigns ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "CAMPAIGNS_MANAGE");
    if (denied) return denied;

    const userId = resolveUserId(session);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign)
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 });

    await prisma.$transaction([
      prisma.messageQueue.updateMany({
        where: { campaignId: id, status: QueueStatus.pending },
        data: { status: QueueStatus.cancelled },
      }),
      prisma.message.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/campaigns:", err);
    return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
  }
}
