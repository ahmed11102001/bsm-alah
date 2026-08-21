import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection } from "@/types/enums";

function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

async function getReturningContactIds(userId: string, since: Date): Promise<string[]> {
  const rows = await prisma.message.findMany({
    where: { userId, direction: MessageDirection.inbound, createdAt: { gte: since } },
    select: { contactId: true, createdAt: true },
  });

  const days = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = days.get(row.contactId) ?? new Set<string>();
    set.add(row.createdAt.toISOString().slice(0, 10));
    days.set(row.contactId, set);
  }

  return [...days.entries()].filter(([, dates]) => dates.size >= 3).map(([id]) => id);
}

async function resolveAudienceContactIds(userId: string, audienceId: string): Promise<string[]> {
  if (audienceId === "engaged") {
    const rows = await prisma.message.groupBy({
      by: ["contactId"],
      where: { userId, direction: MessageDirection.inbound },
      _count: { id: true },
    });
    return rows.map((row) => row.contactId);
  }

  if (audienceId === "no-response") {
    const sent = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.outbound },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const sentIds = sent.map((row) => row.contactId);
    if (!sentIds.length) return [];

    const replied = await prisma.message.findMany({
      where: { userId, direction: MessageDirection.inbound, contactId: { in: sentIds } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const repliedSet = new Set(replied.map((row) => row.contactId));
    return sentIds.filter((id) => !repliedSet.has(id));
  }

  if (audienceId === "vip") {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const frequentIds = await getReturningContactIds(userId, ninetyDaysAgo);

    let repeatBuyerIds: string[] = [];
    try {
      const rows = await prisma.storeOrder.groupBy({
        by: ["contactId"],
        where: { userId, contactId: { not: null } },
        _count: { id: true },
      });
      repeatBuyerIds = rows
        .filter((row) => row.contactId !== null && row._count.id >= 2)
        .map((row) => row.contactId as string);
    } catch {
      // Keep VIP based on repeat conversations if store orders are unavailable.
    }

    return [...new Set([...frequentIds, ...repeatBuyerIds])];
  }

  const audience = await prisma.audience.findFirst({
    where: { id: audienceId, userId },
    select: { id: true },
  });
  if (!audience) return [];

  const rows = await prisma.contact.findMany({
    where: { audienceId: audience.id, userId, deletedAt: null },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId = uid(session);
  const { searchParams } = new URL(req.url);
  const audienceId = searchParams.get("audienceId");
  if (!audienceId) return NextResponse.json({ error: "audienceId مطلوب" }, { status: 400 });

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || "50")));
  const search = (searchParams.get("search") || "").trim();
  const sort = searchParams.get("sort") || "lastActivity";
  const filter = searchParams.get("filter") || "all";

  const ids = await resolveAudienceContactIds(userId, audienceId);
  if (!ids.length) {
    return NextResponse.json({
      contacts: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      stats: { active: 0, unread: 0, ai: 0, handoff: 0, pinned: 0 },
    });
  }

  const where: any = {
    userId,
    deletedAt: null,
    id: { in: ids },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (filter === "active") {
    where.lastMessageAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  } else if (filter === "unread") {
    where.unreadCount = { gt: 0 };
  } else if (filter === "ai") {
    where.textAiEnabled = true;
  } else if (filter === "handoff") {
    where.handoffAt = { not: null };
  } else if (filter === "pinned") {
    where.isPinned = true;
  } else if (filter === "archived") {
    where.isArchived = true;
  }

  const orderBy: any =
    sort === "messages"
      ? { messages: { _count: "desc" } }
      : sort === "name"
        ? { name: "asc" }
        : sort === "oldest"
          ? { lastMessageAt: "asc" }
          : { lastMessageAt: "desc" };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        phone: true,
        name: true,
        notes: true,
        lastMessageAt: true,
        unreadCount: true,
        isArchived: true,
        isPinned: true,
        textAiEnabled: true,
        voiceAgentEnabled: true,
        aiStatus: true,
        handoffAt: true,
        handoffReason: true,
        assignedToUserId: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true, storeOrders: true } },
      },
    }),
  ]);

  const allContacts = await prisma.contact.findMany({
    where: { userId, deletedAt: null, id: { in: ids } },
    select: {
      lastMessageAt: true,
      unreadCount: true,
      textAiEnabled: true,
      handoffAt: true,
      isPinned: true,
    },
  });

  const stats = {
    active: allContacts.filter((c) => c.lastMessageAt && c.lastMessageAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    unread: allContacts.filter((c) => c.unreadCount > 0).length,
    ai: allContacts.filter((c) => c.textAiEnabled).length,
    handoff: allContacts.filter((c) => c.handoffAt).length,
    pinned: allContacts.filter((c) => c.isPinned).length,
  };

  return NextResponse.json({
    contacts: contacts.map((c) => ({
      ...c,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      handoffAt: c.handoffAt?.toISOString() ?? null,
      aiStatus: String(c.aiStatus),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats,
  });
}
