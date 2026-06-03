// src/app/api/audiences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageDirection } from "@/types/enums";
import { checkContactsLimit } from "@/lib/plan-guard";
import { normalizePhone } from "@/lib/phone";

function uid(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

function normalizeContactsInput(contacts: any[]): { phone: string; name: string | null }[] {
  return [
    ...new Map(
      contacts
        .map((c) => {
          const phone = normalizePhone(String(c?.phone ?? ""));
          if (!phone) return null;
          return { phone, name: c?.name ? String(c.name).trim() : null };
        })
        .filter((c): c is { phone: string; name: string | null } => Boolean(c))
        .map((c) => [c.phone, c])
    ).values(),
  ];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);
  const { searchParams } = new URL(req.url);
  const audienceId = searchParams.get("audienceId");
  const includeContacts = searchParams.get("includeContacts");

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

    if (!audience) return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

    return NextResponse.json({
      id: audience.id,
      name: audience.name,
      notes: null,
      type: audience.type ?? "excel",
      contacts: audience.contacts,
      contactCount: audience._count.contacts,
      createdAt: audience.createdAt.toISOString(),
    });
  }

  // ── Regular audiences (excel + custom) ──────────────────────────────────────
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

  const audiences = rawAudiences.map((a) => ({
    id: a.id,
    name: a.name,
    notes: null as string | null,
    type: a.type ?? "excel",
    contacts: a.contacts,
    contactCount: a._count.contacts,
    createdAt: a.createdAt.toISOString(),
  }));

  // ── Smart card 1: العملاء المتفاعلون ────────────────────────────────────────
  // كل من رد على رسالة ولو مرة واحدة
  const engagedRows = await prisma.message.groupBy({
    by: ["contactId"],
    where: { userId, direction: MessageDirection.inbound },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 200,
  });
  const engagedIds = engagedRows.map((r) => r.contactId);

  const engagedContacts = await prisma.contact.findMany({
    where: { id: { in: engagedIds.slice(0, 5) }, userId, deletedAt: null },
    take: 5,
    select: { id: true, phone: true, name: true },
  });

  const engagedCard = {
    id: "engaged",
    name: "العملاء المتفاعلون",
    notes: null,
    type: "engaged",
    contacts: engagedContacts,
    contactCount: engagedIds.length,
    createdAt: new Date().toISOString(),
  };

  // ── Smart card 2: VIP الحقيقيون ─────────────────────────────────────────────
  // المعايير (يكفي أي شرط):
  //   A) ≥ 3 رسائل واردة (تفاعل متكرر) خلال آخر 90 يوم
  //   B) ≥ 2 طلبات من المتجر
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // A: تفاعل متكرر حديث
  const frequentEngaged = await prisma.message.groupBy({
    by: ["contactId"],
    where: {
      userId,
      direction: MessageDirection.inbound,
      createdAt: { gte: ninetyDaysAgo },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 100,
  });
  const frequentIds = frequentEngaged
    .filter((r) => r._count.id >= 3)
    .map((r) => r.contactId);

  // B: عملاء كرروا الشراء (طلبان أو أكثر)
  let repeatBuyerIds: string[] = [];
  try {
    const orderGroups = await prisma.storeOrder.groupBy({
      by: ["contactId"],
      where: { userId, contactId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 100,
    });
    repeatBuyerIds = orderGroups
      .filter((r) => r._count.id >= 2 && r.contactId !== null)
      .map((r) => r.contactId as string);
  } catch {
    // storeOrder قد لا يكون موجود في كل البيئات
  }

  // دمج بدون تكرار
  const vipIdSet = new Set([...frequentIds, ...repeatBuyerIds]);
  const vipIds = [...vipIdSet].slice(0, 50);

  const vipContacts = await prisma.contact.findMany({
    where: { id: { in: vipIds.slice(0, 5) }, userId, deletedAt: null },
    take: 5,
    select: { id: true, phone: true, name: true },
  });

  const vipCard = {
    id: "vip",
    name: "العملاء المميزون VIP",
    notes: null,
    type: "vip",
    contacts: vipContacts,
    contactCount: vipIds.length,
    createdAt: new Date().toISOString(),
  };

  // ── Smart card 3: لم يردوا ───────────────────────────────────────────────────
  const sentContactIds = await prisma.message.findMany({
    where: { userId, direction: MessageDirection.outbound },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const sentIds = sentContactIds.map((m) => m.contactId);

  const repliedIds = await prisma.message.findMany({
    where: { userId, direction: MessageDirection.inbound, contactId: { in: sentIds } },
    select: { contactId: true },
    distinct: ["contactId"],
  });
  const repliedSet = new Set(repliedIds.map((m) => m.contactId));
  const noRespIds = sentIds.filter((id) => !repliedSet.has(id));

  const noRespContacts = await prisma.contact.findMany({
    where: { id: { in: noRespIds.slice(0, 5) }, deletedAt: null },
    select: { id: true, phone: true, name: true },
  });

  const noRespCard = {
    id: "no-response",
    name: "لم يردوا على رسائلك",
    notes: null,
    type: "no-response",
    contacts: noRespContacts,
    contactCount: noRespIds.length,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json([vipCard, engagedCard, noRespCard, ...audiences]);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const body = await req.json();
  const { name, notes, type = "excel", contacts } = body;

  if (!name?.trim()) return NextResponse.json({ error: "اسم الجمهور مطلوب" }, { status: 400 });
  if (!Array.isArray(contacts) || contacts.length === 0)
    return NextResponse.json({ error: "لا توجد جهات اتصال" }, { status: 400 });

  const unique = normalizeContactsInput(contacts);
  if (unique.length === 0)
    return NextResponse.json({ error: "لا توجد جهات اتصال صالحة" }, { status: 400 });

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
        data: { name: name.trim(), type: String(type || "excel"), userId },
      });

      for (const c of unique) {
        await tx.contact.upsert({
          where: { phone_userId: { phone: c.phone, userId } },
          update: { audienceId: createdAudience.id, name: c.name ?? undefined, deletedAt: null },
          create: { phone: c.phone, name: c.name, userId, audienceId: createdAudience.id },
        });
      }

      return tx.audience.findUniqueOrThrow({
        where: { id: createdAudience.id },
        include: {
          contacts: { where: { deletedAt: null }, take: 5, select: { id: true, phone: true, name: true } },
          _count: { select: { contacts: { where: { deletedAt: null } } } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id: audience.id,
        name: audience.name,
        notes: notes ?? null,
        type: audience.type ?? type,
        contacts: audience.contacts,
        contactCount: audience._count.contacts,
        createdAt: audience.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("POST /api/audiences:", err);
    return NextResponse.json({ error: err.message ?? "فشل الحفظ" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { id, contacts } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  if (!Array.isArray(contacts) || contacts.length === 0)
    return NextResponse.json({ error: "contacts مطلوبة" }, { status: 400 });

  const normalizedContacts = normalizeContactsInput(contacts);
  if (normalizedContacts.length === 0)
    return NextResponse.json({ error: "لا توجد جهات اتصال صالحة" }, { status: 400 });

  const audience = await prisma.audience.findFirst({ where: { id, userId } });
  if (!audience) return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.contact.updateMany({ where: { audienceId: id, userId }, data: { deletedAt: new Date() } });

    for (const c of normalizedContacts) {
      await tx.contact.upsert({
        where: { phone_userId: { phone: c.phone, userId } },
        update: { audienceId: id, name: c.name ?? undefined, deletedAt: null },
        create: { phone: c.phone, name: c.name ?? null, userId, audienceId: id },
      });
    }
  });

  const updated = await prisma.audience.findUnique({
    where: { id },
    include: {
      contacts: { where: { deletedAt: null }, select: { id: true, phone: true, name: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const userId = uid(session);

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const audience = await prisma.audience.findFirst({ where: { id, userId } });
  if (!audience) return NextResponse.json({ error: "الجمهور غير موجود" }, { status: 404 });

  await prisma.$transaction([
    prisma.contact.updateMany({ where: { audienceId: id, userId }, data: { audienceId: null } }),
    prisma.audience.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
