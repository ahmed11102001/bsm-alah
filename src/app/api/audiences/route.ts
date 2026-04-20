// src/app/api/audiences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus } from "@prisma/client";

// ─── helper ───────────────────────────────────────────────────────────────────
function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

// ─── GET /api/audiences ────────────────────────────────────────────────────────
// Returns: all user audiences + VIP card + no-response card
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  // ── 1. regular audiences (excel + custom) ──────────────────────
  const rawAudiences = await prisma.audience.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      contacts: {
        where: { deletedAt: null },
        take: 5,
        select: { id: true, phone: true, name: true },
      },
      _count: {
        select: { contacts: { where: { deletedAt: null } } },
      },
    },
  });

  const audiences = rawAudiences.map(a => ({
    id:           a.id,
    name:         a.name,
    notes:        null as string | null,
    type:         (a as any).type as string ?? "excel",
    contacts:     a.contacts,
    contactCount: a._count.contacts,
    createdAt:    a.createdAt.toISOString(),
  }));

  // ── 2. VIP: top 50 contacts by message count ───────────────────
  const vipRaw = await prisma.contact.findMany({
    where: { userId, deletedAt: null, isArchived: false },
    orderBy: { unreadCount: "desc" },
    take: 50,
    select: { id: true, phone: true, name: true, unreadCount: true },
  });

  // only include contacts that have sent at least 1 inbound message
  const vipContacts = vipRaw.filter(c => c.unreadCount > 0 || true); // show top 50 regardless
  const actualVip = (await prisma.message.groupBy({
    by: ["contactId"],
    where: { userId, direction: MessageDirection.inbound },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  })).map(r => r.contactId);

  const vipContacts2 = await prisma.contact.findMany({
    where: { id: { in: actualVip }, userId, deletedAt: null },
    take: 5,
    select: { id: true, phone: true, name: true },
  });

  const vipCard = {
    id:           "vip",
    name:         "العملاء المميزون VIP",
    notes:        null,
    type:         "vip",
    contacts:     vipContacts2,
    contactCount: actualVip.length,
    createdAt:    new Date().toISOString(),
  };

  // ── 3. No-response: sent to but never replied ──────────────────
  const sentContactIds = await prisma.message.findMany({
    where: { userId, direction: MessageDirection.outbound },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const sentIds = sentContactIds.map(m => m.contactId);

  const repliedIds = await prisma.message.findMany({
    where: { userId, direction: MessageDirection.inbound, contactId: { in: sentIds } },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const repliedSet = new Set(repliedIds.map(m => m.contactId));
  const noRespIds  = sentIds.filter(id => !repliedSet.has(id));

  const noRespContacts = await prisma.contact.findMany({
    where: { id: { in: noRespIds.slice(0, 5) }, deletedAt: null },
    select: { id: true, phone: true, name: true },
  });

  const noRespCard = {
    id:           "no-response",
    name:         "لم يردوا على رسائلك",
    notes:        null,
    type:         "no-response",
    contacts:     noRespContacts,
    contactCount: noRespIds.length,
    createdAt:    new Date().toISOString(),
  };

  return NextResponse.json([vipCard, noRespCard, ...audiences]);
}

// ─── POST /api/audiences ───────────────────────────────────────────────────────
// Body: { name, notes?, type: "excel"|"custom", contacts: { phone, name? }[] }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const body = await req.json();
  const { name, notes, type = "excel", contacts } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "اسم الجمهور مطلوب" }, { status: 400 });
  if (!Array.isArray(contacts) || contacts.length === 0)
    return NextResponse.json({ error: "لا توجد جهات اتصال" }, { status: 400 });

  // Deduplicate phones
  const unique = [...new Map(contacts.map((c: any) => [c.phone, c])).values()] as {
    phone: string; name?: string | null
  }[];

  try {
    const audience = await prisma.audience.create({
      data: {
        name:    name.trim(),
        userId,
        // store type in name prefix if schema has no type field — use notes field as workaround
        // Ideally add a `type` field to Audience model
        contacts: {
          create: unique.map(c => ({
            phone:  c.phone,
            name:   c.name ?? null,
            userId,
          })),
        },
      },
      include: {
        contacts: {
          where: { deletedAt: null },
          take: 5,
          select: { id: true, phone: true, name: true },
        },
        _count: { select: { contacts: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id:           audience.id,
        name:         audience.name,
        notes:        notes ?? null,
        type,
        contacts:     audience.contacts,
        contactCount: audience._count.contacts,
        createdAt:    audience.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("POST /api/audiences:", err);
    return NextResponse.json({ error: err.message ?? "فشل الحفظ" }, { status: 500 });
  }
}

// ─── PATCH /api/audiences ──────────────────────────────────────────────────────
// Body: { id, contacts: ContactRow[] }
// Replaces the contact list of the audience
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { id, contacts } = await req.json();

  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const audience = await prisma.audience.findFirst({ where: { id, userId } });
  if (!audience) return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

  // Soft-delete existing contacts then re-create
  // (alternatively: upsert each — here we go simple: delete all + recreate)
  await prisma.$transaction(async (tx) => {
    // soft-delete old contacts
    await tx.contact.updateMany({
      where: { audienceId: id, userId },
      data:  { deletedAt: new Date() },
    });

    // create new list
    for (const c of contacts as { phone: string; name: string | null }[]) {
      await tx.contact.upsert({
        where: { phone_userId: { phone: c.phone, userId } },
        update: {
          audienceId: id,
          name:       c.name ?? undefined,
          deletedAt:  null,
        },
        create: {
          phone:     c.phone,
          name:      c.name ?? null,
          userId,
          audienceId: id,
        },
      });
    }
  });

  const updated = await prisma.audience.findUnique({
    where: { id },
    include: {
      contacts: { where: { deletedAt: null }, select: { id: true, phone: true, name: true } },
      _count:   { select: { contacts: { where: { deletedAt: null } } } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ─── DELETE /api/audiences ─────────────────────────────────────────────────────
// Body: { id }
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const audience = await prisma.audience.findFirst({ where: { id, userId } });
  if (!audience) return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

  // Unlink contacts then delete audience
  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { audienceId: id, userId },
      data:  { audienceId: null },
    }),
    prisma.audience.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}