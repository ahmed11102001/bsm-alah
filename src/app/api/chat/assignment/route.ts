import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/permissions";

function tenantId(session: { user: { id: string; parentId?: string | null } }) {
  return session.user.parentId ?? session.user.id;
}

function canSeeContact(session: { user: { id: string; role?: string | null; parentId?: string | null } }, contact: { userId: string; assignedToUserId: string | null }) {
  return contact.userId === tenantId(session) && (session.user.role !== "CHAT_ONLY" || contact.assignedToUserId === session.user.id);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CHAT_VIEW");
  if (denied) return denied;

  const contactId = new URL(req.url).searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "contactId مطلوب" }, { status: 400 });
  const contact = await prisma.contact.findFirst({ where: { id: contactId, deletedAt: null }, select: { id: true, userId: true, assignedToUserId: true } });
  if (!contact || !canSeeContact(session!, contact)) return NextResponse.json({ error: "المحادثة غير متاحة" }, { status: 404 });

  const canAssign = hasPermission(session!.user.role, "CHAT_ASSIGN");
  const members = canAssign
    ? await prisma.user.findMany({
      where: { parentId: tenantId(session!), deletedAt: null, role: { in: ["FULL_ACCESS", "CHAT_ONLY"] } },
      orderBy: { name: "asc" }, select: { id: true, name: true, email: true, image: true, role: true },
    })
    : [];
  return NextResponse.json({ assignedToUserId: contact.assignedToUserId, members, canAssign });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "CHAT_ASSIGN");
  if (denied) return denied;

  const body = await req.json();
  const contactId = typeof body.contactId === "string" ? body.contactId : "";
  const assignedToUserId = body.assignedToUserId === null || typeof body.assignedToUserId === "string" ? body.assignedToUserId : undefined;
  if (!contactId || assignedToUserId === undefined) return NextResponse.json({ error: "contactId و assignedToUserId مطلوبان" }, { status: 400 });

  const ownerId = tenantId(session!);
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      userId: ownerId,
      deletedAt: null,
      messages: { some: { deletedAt: null } },
    },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });

  if (assignedToUserId) {
    const member = await prisma.user.findFirst({
      where: { id: assignedToUserId, parentId: ownerId, deletedAt: null, role: { in: ["FULL_ACCESS", "CHAT_ONLY"] } },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "عضو الفريق غير صالح" }, { status: 404 });
  }

  const updated = await prisma.contact.update({ where: { id: contact.id }, data: { assignedToUserId }, select: { id: true, assignedToUserId: true } });
  return NextResponse.json({ success: true, ...updated });
}
