// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus } from "@prisma/client";

// ─── helpers ──────────────────────────────────────────────────────────────────
function resolveUserId(session: any): string {
  const parent = (session.user as any).parentId as string | null;
  return parent ?? (session.user as any).id;
}

function dateRange(from?: string | null, to?: string | null) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
  const lte = to   ? new Date(to)   : new Date();
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

// ─── GET /api/reports?type=overview|customers|team|logs ───────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);
    const type    = searchParams.get("type") ?? "overview";
    const from    = searchParams.get("from");
    const to      = searchParams.get("to");
    const range   = dateRange(from, to);

    switch (type) {
      case "overview":  return overview(userId, range);
      case "customers": return customers(userId, range, searchParams);
      case "team":      return team(userId);
      case "logs":      return logs(userId, range, searchParams);
      default:          return NextResponse.json({ error: "نوع غير معروف" }, { status: 400 });
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
    prisma.message.count({ where: { userId, status: MessageStatus.delivered,       createdAt: range } }),
    prisma.message.count({ where: { userId, status: MessageStatus.read,            createdAt: range } }),
    prisma.message.count({ where: { userId, status: MessageStatus.failed,          createdAt: range } }),
    prisma.message.count({ where: { userId, direction: MessageDirection.inbound,   createdAt: range } }),
    prisma.contact.count({ where: { userId, createdAt: range } }),

    // best campaigns (top 5 by readCount)
    prisma.campaign.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { readCount: "desc" },
      take: 5,
      select: { name: true, sentCount: true, deliveredCount: true, readCount: true, failedCount: true },
    }),

    // daily messages for chart — raw messages grouped by date
    prisma.$queryRaw<{ day: string; sent: bigint; received: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE direction = 'outbound') AS sent,
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
  const readRate     = totalSent > 0 ? +((totalRead      / totalSent) * 100).toFixed(1) : 0;
  const replyRate    = totalSent > 0 ? +((inbound        / totalSent) * 100).toFixed(1) : 0;

  const daily = dailyRaw.map((r) => ({
    day:      r.day,
    sent:     Number(r.sent),
    received: Number(r.received),
  }));

  const hourly = hourlyRaw.map((r) => ({
    hour: Number(r.hour),
    cnt:  Number(r.cnt),
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

  const memberIds = members.map((m) => m.id);

  const [sentPerUser, repliedPerUser] = await Promise.all([
    prisma.message.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds }, direction: MessageDirection.outbound },
      _count: { id: true },
    }),
    prisma.message.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds }, direction: MessageDirection.inbound },
      _count: { id: true },
    }),
  ]);

  const sentMap   = new Map(sentPerUser.map((r)   => [r.userId, r._count.id]));
  const repliedMap = new Map(repliedPerUser.map((r) => [r.userId, r._count.id]));

  const result = members.map((m) => ({
    id:       m.id,
    name:     m.name ?? m.email,
    role:     m.role,
    sent:     sentMap.get(m.id)    ?? 0,
    replied:  repliedMap.get(m.id) ?? 0,
  }));

  return NextResponse.json(result);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
async function logs(
  userId: string,
  range: { gte: Date; lte: Date },
  params: URLSearchParams
) {
  const page   = Math.max(parseInt(params.get("page")  ?? "1"),  1);
  const limit  = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const status = params.get("status");
  const search = params.get("search");
  const msgType = params.get("msgType");

  const where: any = {
    userId,
    createdAt: range,
  };
  if (status)  where.status  = status;
  if (msgType) where.type    = msgType;
  if (search)  where.contact = { phone: { contains: search } };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact:  { select: { phone: true, name: true } },
        campaign: { select: { name: true } },
        user:     { select: { name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, limit, messages });
}