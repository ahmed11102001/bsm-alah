// src/app/api/audiences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus } from "@prisma/client";
import { checkContactsLimit } from "@/lib/plan-guard";

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
  const { searchParams } = new URL(req.url);
  const audienceId = searchParams.get("audienceId");
  const includeContacts = searchParams.get("includeContacts");

  // Used by campaign flow to import all contacts from a specific audience
  if (audienceId) {
    const audience = await prisma.audience.findFirst({
      where: { id: audienceId, userId },
      include: {
        contacts: {
          where: { deletedAt: null },
          ...(includeContacts === "all" ? {} : { take: 5 }),
          select: { id: true, phone: true, name: true },
        },
        _count: {
          select: { contacts: { where: { deletedAt: null } } },
        },
      },
    });

    if (!audience)
      return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

    return NextResponse.json({
      id:           audience.id,
      name:         audience.name,
      notes:        null,
      type:         audience.type ?? "excel",
      contacts:     audience.contacts,
      contactCount: audience._count.contacts,
      createdAt:    audience.createdAt.toISOString(),
    });
  }

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
    type:         a.type ?? "excel",
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
  if (!session?.user) return NextResponse.json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" }, { status: 401 });
  const userId = uid(session);

  const body = await req.json();
  const { name, notes, type = "excel", contacts } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "\u0627\u0633\u0645 \u0627\u0644\u062C\u0645\u0647\u0648\u0631 \u0645\u0637\u0644\u0648\u0628" }, { status: 400 });
  if (!Array.isArray(contacts) || contacts.length === 0)
    return NextResponse.json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644" }, { status: 400 });

  // Deduplicate + sanitize
  const unique = [
    ...new Map(
      (contacts as any[])
        .map((c) => ({
          phone: String(c?.phone ?? "").trim(),
          name: c?.name ? String(c.name).trim() : null,
        }))
        .filter((c) => c.phone.length > 0)
        .map((c) => [c.phone, c])
    ).values(),
  ] as { phone: string; name: string | null }[];

  if (unique.length === 0)
    return NextResponse.json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644 \u0635\u0627\u0644\u062D\u0629" }, { status: 400 });

  // ── تحقق من حد الخطة قبل الإضافة ────────────────────────────────────────
  const limitCheck = await checkContactsLimit(userId, unique.length);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, code: limitCheck.code, requiredPlan: limitCheck.requiredPlan },
      { status: 403 }
    );
  }

  try {
    const audience = await prisma.$transaction(async (tx) => {
      const createdAudience = await tx.audience.create({
        data: {
          name: name.trim(),
          type: String(type || "excel"),
          userId,
        },
      });

      // Upsert avoids unique(phone,userId) crashes for existing contacts
      for (const c of unique) {
        await tx.contact.upsert({
          where: { phone_userId: { phone: c.phone, userId } },
          update: {
            audienceId: createdAudience.id,
            name: c.name ?? undefined,
            deletedAt: null,
          },
          create: {
            phone: c.phone,
            name: c.name,
            userId,
            audienceId: createdAudience.id,
          },
        });
      }

      return tx.audience.findUniqueOrThrow({
        where: { id: createdAudience.id },
        include: {
          contacts: {
            where: { deletedAt: null },
            take: 5,
            select: { id: true, phone: true, name: true },
          },
          _count: { select: { contacts: { where: { deletedAt: null } } } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id:           audience.id,
        name:         audience.name,
        notes:        notes ?? null,
        type:         audience.type ?? type,
        contacts:     audience.contacts,
        contactCount: audience._count.contacts,
        createdAt:    audience.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("POST /api/audiences:", err);
    return NextResponse.json({ error: err.message ?? "\u0641\u0634\u0644 \u0627\u0644\u062D\u0641\u0638" }, { status: 500 });
  }
}

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
