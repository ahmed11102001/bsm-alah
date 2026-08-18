// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus } from "@/types/enums";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

// ─── helpers ──────────────────────────────────────────────────────────────────
function resolveUserId(session: any): string {
  const parent = (session.user as any).parentId as string | null;
  return parent ?? (session.user as any).id;
}

function dateRange(from?: string | null, to?: string | null) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
  const lte = to ? new Date(to) : new Date();
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}
// ─── GET /api/reports?type=overview|customers|team|logs ───────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requirePermission(session, "REPORTS_VIEW");
    if (denied) return denied;

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") ?? "overview";

    // ✅ حماية التقارير المتقدمة
    if (["customers", "team", "logs"].includes(type)) {
      const check = await checkFeature(userId, "advancedReports");
      const block = guardResponse(check);
      if (block) return block;
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const range = dateRange(from, to);

    switch (type) {
      case "overview": return overview(userId, range);
      case "customers": return customers(userId, range, searchParams);
      case "team": return team(userId);
      case "logs": return logs(userId, range, searchParams);
      default:
        return NextResponse.json(
          { error: "نوع غير معروف" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("reports error:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}

// ─── Overview ─────────────────────────────────────────────────────────────────
async function overview(userId: string, range: { gte: Date; lte: Date }) {
  const [
    totalSent, totalDelivered, totalRead, totalFailed,
    inbound, uniqueContacts,
    campaigns,
    dailyRaw,
    hourlyRaw,
  ] = await Promise.all([
    // totals
    prisma.message.count({ where: { userId, direction: MessageDirection.outbound, createdAt: range } }),
    // delivered = delivered + read (اللي اتقرأ اتوصّل بالتأكيد)
    prisma.message.count({ where: { userId, status: { in: [MessageStatus.delivered, MessageStatus.read] }, createdAt: range } }),
    prisma.message.count({ where: { userId, status: MessageStatus.read, createdAt: range } }),
    prisma.message.count({ where: { userId, status: MessageStatus.failed, createdAt: range } }),
    prisma.message.count({ where: { userId, direction: MessageDirection.inbound, createdAt: range } }),
    prisma.contact.count({ where: { userId, createdAt: range } }),

    // best campaigns (top 5 by readCount)
    prisma.campaign.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { readCount: "desc" },
      take: 5,
      select: { name: true, sentCount: true, deliveredCount: true, readCount: true, failedCount: true },
    }),

    // daily messages for chart — raw messages grouped by date
    prisma.$queryRaw<{ day: string; sent: bigint; delivered: bigint; received: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE direction = 'outbound') AS sent,
        COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('delivered', 'read')) AS delivered,
        COUNT(*) FILTER (WHERE direction = 'inbound')  AS received
      FROM "Message"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${range.gte}
        AND "createdAt" <= ${range.lte}
      GROUP BY day
      ORDER BY day ASC
    `,

    // best hour to send
    prisma.$queryRaw<{ hour: number; cnt: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM "sentAt") AS hour,
        COUNT(*) AS cnt
      FROM "Message"
      WHERE "userId" = ${userId}
        AND "sentAt" IS NOT NULL
        AND "createdAt" >= ${range.gte}
        AND "createdAt" <= ${range.lte}
      GROUP BY hour
      ORDER BY hour ASC
    `,
  ]);

  const deliveryRate = totalSent > 0 ? +((totalDelivered / totalSent) * 100).toFixed(1) : 0;
  const readRate = totalSent > 0 ? +((totalRead / totalSent) * 100).toFixed(1) : 0;
  const replyRate = totalSent > 0 ? +((inbound / totalSent) * 100).toFixed(1) : 0;

  const daily = dailyRaw.map((r) => ({
    day: r.day,
    sent: Number(r.sent),
    delivered: Number(r.delivered),
    received: Number(r.received),
  }));

  const hourly = hourlyRaw.map((r) => ({
    hour: Number(r.hour),
    cnt: Number(r.cnt),
  }));

  return NextResponse.json({
    totals: {
      sent: totalSent, delivered: totalDelivered,
      read: totalRead, failed: totalFailed,
      inbound, uniqueContacts,
      deliveryRate, readRate, replyRate,
    },
    daily,
    hourly,
    bestCampaigns: campaigns.map((c) => ({
      ...c,
      rate: c.sentCount > 0 ? +((c.readCount / c.sentCount) * 100).toFixed(1) : 0,
    })),
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────
async function customers(
  userId: string,
  range: { gte: Date; lte: Date },
  params: URLSearchParams
) {
  const segment = params.get("segment") ?? "engaged";

  if (segment === "engaged") {
    // أكثر العملاء تفاعلاً: أعلى عدد رسائل (inbound)
    const rows = await prisma.contact.findMany({
      where: { userId, deletedAt: null },
      orderBy: { unreadCount: "desc" },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(rows.map((r) => ({
      id: r.id, phone: r.phone, name: r.name,
      lastMessageAt: r.lastMessageAt,
      totalMessages: r._count.messages,
      unreadCount: r.unreadCount,
    })));
  }

  if (segment === "no-response") {
    // أرسلنا إليهم لكن لم يردوا
    const sentContactIds = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.outbound, createdAt: range },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const ids = sentContactIds.map((m) => m.contactId);

    const repliedIds = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.inbound, contactId: { in: ids } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const repliedSet = new Set(repliedIds.map((m) => m.contactId));
    const noReplyIds = ids.filter((id) => !repliedSet.has(id));

    const contacts = await prisma.contact.findMany({
      where: { id: { in: noReplyIds.slice(0, 50) }, deletedAt: null },
      select: { id: true, phone: true, name: true, lastMessageAt: true },
    });
    return NextResponse.json(contacts);
  }

  if (segment === "new") {
    const contacts = await prisma.contact.findMany({
      where: { userId, createdAt: range, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, phone: true, name: true, createdAt: true, lastMessageAt: true },
    });
    return NextResponse.json(contacts);
  }

  if (segment === "archived") {
    const contacts = await prisma.contact.findMany({
      where: { userId, isArchived: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, phone: true, name: true, lastMessageAt: true, updatedAt: true },
    });
    return NextResponse.json(contacts);
  }

  if (segment === "followup") {
    // لم يتواصل معهم منذ أكثر من 7 أيام + آخر رسالة كانت واردة
    const cutoff = new Date(Date.now() - 7 * 86400_000);
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: false,
        lastMessageAt: { lt: cutoff, not: null },
      },
      orderBy: { lastMessageAt: "asc" },
      take: 50,
      select: { id: true, phone: true, name: true, lastMessageAt: true },
    });
    return NextResponse.json(contacts);
  }

  return NextResponse.json([]);
}

// ─── Team ─────────────────────────────────────────────────────────────────────
async function team(ownerId: string) {
  // جلب الـ owner + كل أعضاء الفريق
  const members = await prisma.user.findMany({
    where: {
      OR: [
        { id: ownerId },
        { parentId: ownerId },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const memberIds = members.map((m: { id: string }) => m.id);

  const [sentPerUser, receivedPerMember, ownerReceived, assignedPerUser, unassignedCount] = await Promise.all([
    // الرسائل البشرية الخارجة تُنسب للعضو الذي ضغط إرسال، وليس لمالك الـworkspace.
    prisma.message.groupBy({
      by: ["senderUserId"],
      where: {
        senderUserId: { in: memberIds },
        direction: MessageDirection.outbound,
        senderType: "human",
        deletedAt: null,
      },
      _count: { id: true },
    }),
    // الرسائل الواردة لا تملك senderUserId؛ ننسبها للعضو المسؤول عن المحادثة.
    prisma.$queryRaw<{ userId: string; count: bigint }[]>`
      SELECT c."assignedToUserId" AS "userId", COUNT(m."id")::bigint AS "count"
      FROM "Message" m
      INNER JOIN "Contact" c ON c."id" = m."contactId"
      WHERE m."userId" = ${ownerId}
        AND m."direction" = 'inbound'
        AND m."deletedAt" IS NULL
        AND c."userId" = ${ownerId}
        AND c."deletedAt" IS NULL
        AND c."assignedToUserId" IS NOT NULL
        AND c."assignedToUserId" IN (${Prisma.join(memberIds)})
      GROUP BY c."assignedToUserId"
    `,
    // الوارد يُنسب للـOwner فقط لو المحادثة باسمه أو غير مُعيّنة؛
    // رسائل محادثات الأعضاء لا تتكرر عند الـOwner.
    prisma.message.count({
      where: {
        userId: ownerId,
        direction: MessageDirection.inbound,
        deletedAt: null,
        contact: {
          userId: ownerId,
          deletedAt: null,
          OR: [
            { assignedToUserId: null },
            { assignedToUserId: ownerId },
          ],
        },
      },
    }),
    // ── عدد المحادثات المعيّنة حاليًا لكل عضو (من محادثات الشات الفعلية) ──
    prisma.contact.groupBy({
      by: ["assignedToUserId"],
      where: {
        userId: ownerId,
        deletedAt: null,
        isArchived: false,
        messages: { some: { deletedAt: null } },
        assignedToUserId: { in: memberIds },
      },
      _count: { id: true },
    }),
    // ── عدد المحادثات اللي لسه من غير مسؤول (من محادثات الشات الفعلية) ──
    prisma.contact.count({
      where: {
        userId: ownerId,
        deletedAt: null,
        isArchived: false,
        messages: { some: { deletedAt: null } },
        assignedToUserId: null,
      },
    }),
  ]);

  const sentMap = new Map(sentPerUser.map((r: { senderUserId: string | null; _count: { id: number } }) => [r.senderUserId, r._count.id]));
  const repliedMap = new Map<string, number>([
    [ownerId, ownerReceived],
    ...receivedPerMember.map((r: { userId: string; count: bigint }) => [r.userId, Number(r.count)] as [string, number]),
  ]);
  const assignedMap = new Map(assignedPerUser.map((r: { assignedToUserId: string | null; _count: { id: number } }) => [r.assignedToUserId, r._count.id]));

  const result = members.map((m: { id: string; name: string | null; email: string; role: string }) => ({
    id: m.id,
    name: m.name ?? m.email,
    role: m.role,
    sent: sentMap.get(m.id) ?? 0,
    replied: repliedMap.get(m.id) ?? 0,
    assigned: assignedMap.get(m.id) ?? 0,
  }));

  return NextResponse.json({ members: result, unassigned: unassignedCount });
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
async function logs(
  userId: string,
  range: { gte: Date; lte: Date },
  params: URLSearchParams
) {
  const page = Math.max(parseInt(params.get("page") ?? "1"), 1);
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const status = params.get("status");
  const search = params.get("search");
  const msgType = params.get("msgType");

  const where: any = {
    userId,
    createdAt: range,
  };
  if (status) where.status = status;
  if (msgType) where.type = msgType;
  if (search) where.contact = { phone: { contains: search } };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact: { select: { phone: true, name: true } },
        campaign: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, limit, messages });
}