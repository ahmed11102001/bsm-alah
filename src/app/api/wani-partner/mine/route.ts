// src/app/api/wani-partner/mine/route.ts
// كل يوزر بيدير كروته الخاصة هنا (حتى 10 كروت لكل يوزر). أي تعديل في المحتوى
// بيرجّع حالة الكارت pending تاني عشان يتراجع من الأدمن — التفعيل/الإيقاف
// بس هو اللي مش محتاج مراجعة.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserWaniPartnerCardSchema, UserWaniPartnerActiveSchema, parseInput,
} from "@/lib/schemas";

const MAX_CARDS_PER_USER = 10;

// GET — كروت اليوزر الحالي
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const cards = await prisma.waniPartnerCard.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(cards);
}

// PUT — إنشاء كارت جديد أو تعديل كارت موجود (بيرجّعه pending)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(UserWaniPartnerCardSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, ...content } = parsed.data;
  let card;
  if (id) {
    const existing = await prisma.waniPartnerCard.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });
    card = await prisma.waniPartnerCard.update({ where: { id }, data: { ...content, status: "pending", rejectionReason: null, reviewedAt: null, reviewedBy: null } });
  } else {
    const count = await prisma.waniPartnerCard.count({ where: { userId: session.user.id } });
    if (count >= MAX_CARDS_PER_USER) return NextResponse.json({ error: "مسموح بحد أقصى 10 كروت" }, { status: 409 });
    card = await prisma.waniPartnerCard.create({ data: { ...content, userId: session.user.id, status: "pending" } });
  }

  return NextResponse.json(card);
}

// PATCH — تشغيل/إيقاف الكارت بس (من غير ما يرجع لمراجعة الأدمن)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(UserWaniPartnerActiveSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const id = new URL(req.url).searchParams.get("id");
  const existing = id ? await prisma.waniPartnerCard.findFirst({ where: { id, userId: session.user.id } }) : null;
  if (!existing) return NextResponse.json({ error: "لسه معملتش كارت" }, { status: 404 });

  const card = await prisma.waniPartnerCard.update({
    where: { id: existing.id },
    data: { active: parsed.data.active },
  });

  return NextResponse.json(card);
}

// DELETE — مسح كارت اليوزر نفسه
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  const existing = id ? await prisma.waniPartnerCard.findFirst({ where: { id, userId: session.user.id } }) : null;
  if (!existing) return NextResponse.json({ error: "لسه معملتش كارت" }, { status: 404 });

  await prisma.waniPartnerCard.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
