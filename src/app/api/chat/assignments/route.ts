import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

function ownerId(session: any) { return session.user.parentId ?? session.user.id; }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CHAT_ASSIGN");
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;

  if (sp.get("mode") === "members") {
    const members = await prisma.user.findMany({
      where: { parentId: ownerId(session), deletedAt: null, role: { in: ["FULL_ACCESS", "CHAT_ONLY"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, image: true, role: true },
    });
    return NextResponse.json({ members });
  }

  const pageSize = Math.min(Math.max(Number(sp.get("pageSize") || 20), 1), 100);
  const page = Math.max(Number(sp.get("page") || 1), 1);
  const search = (sp.get("search") || "").trim();
  const assignment = sp.get("assignment") || "all";
  const assigneeId = sp.get("assigneeId") || "";
  const status = sp.get("status") || "all";
  const date = sp.get("date") || "all";
  const tenantId = ownerId(session);

  // A Contact becomes a conversation only after at least one non-deleted
  // message is attached to it. Keep this constraint server-side so search,
  // filters, pagination, select-all and counts all operate on conversations.
  const where: any = {
    userId: tenantId,
    deletedAt: null,
    messages: { some: { deletedAt: null } },
  };
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { phone: { contains: search } },
  ];
  if (assignment === "unassigned") where.assignedToUserId = null;
  if (assignment === "assigned") where.assignedToUserId = { not: null };
  if (assigneeId) where.assignedToUserId = assigneeId;
  if (status === "unread") where.unreadCount = { gt: 0 };
  if (status === "archived") where.isArchived = true;
  if (status === "active") where.isArchived = false;
  if (status === "replied") where.messages = { some: { direction: "outbound", deletedAt: null } };
  if (date !== "all") {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    if (date === "7d") from.setDate(from.getDate() - 7);
    if (date === "30d") from.setDate(from.getDate() - 30);
    where.lastMessageAt = { gte: from };
  }

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, phone: true, assignedToUserId: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        unreadCount: true, isArchived: true, lastMessageAt: true,
        messages: { take: 1, orderBy: { createdAt: "desc" }, where: { deletedAt: null }, select: { content: true, type: true, createdAt: true, direction: true } },
      },
    }),
  ]);

  return NextResponse.json({
    conversations: contacts.map(c => ({ ...c, lastMessage: c.messages[0] ?? null, messages: undefined })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CHAT_ASSIGN");
  if (denied) return denied;
  const body = await req.json();
  const contactIds: string[] = Array.isArray(body.contactIds)
    ? Array.from(new Set<string>(body.contactIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)))
    : [];
  const assignedToUserId = body.assignedToUserId === null || typeof body.assignedToUserId === "string" ? body.assignedToUserId : undefined;
  if (contactIds.length === 0 || assignedToUserId === undefined) return NextResponse.json({ error: "contactIds و assignedToUserId مطلوبان" }, { status: 400 });
  if (contactIds.length > 5000) return NextResponse.json({ error: "عدد المحادثات كبير جدًا" }, { status: 400 });

  const tenantId = ownerId(session);
  const conversationScope = {
    id: { in: contactIds },
    userId: tenantId,
    deletedAt: null,
    messages: { some: { deletedAt: null } },
  };
  const count = await prisma.contact.count({ where: conversationScope });
  if (count !== contactIds.length) return NextResponse.json({ error: "بعض المحادثات غير تابعة للحساب الحالي" }, { status: 404 });

  if (assignedToUserId) {
    const member = await prisma.user.findFirst({ where: { id: assignedToUserId, parentId: tenantId, deletedAt: null, role: { in: ["FULL_ACCESS", "CHAT_ONLY"] } }, select: { id: true } });
    if (!member) return NextResponse.json({ error: "عضو الفريق غير صالح" }, { status: 404 });
  }

  const result = await prisma.contact.updateMany({ where: conversationScope, data: { assignedToUserId } });
  return NextResponse.json({ success: true, count: result.count, assignedToUserId });
}
