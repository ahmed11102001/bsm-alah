// src/app/api/admin/wani-partner/route.ts
// إدارة كارت "WANI Partner" في الداشبورد — بدل ما المحتوى يبقى ثابت في الكود
// (src/app/dashboard/page.tsx) بقى متحكم فيه من صفحة /dashboard/wani-partner.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  AdminCreateWaniPartnerCardSchema,
  AdminWaniPartnerCardPatchSchema,
  AdminWaniPartnerCardDeleteSchema,
  parseInput,
} from "@/lib/schemas";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// GET — جيب كل كروت الـ Partner (للأدمن، شامل الغير مفعّل)
export async function GET() {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cards = await prisma.waniPartnerCard.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(cards);
}

// POST — إنشاء كارت جديد
export async function POST(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminCreateWaniPartnerCardSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const card = await prisma.waniPartnerCard.create({ data: parsed.data });
  return NextResponse.json(card, { status: 201 });
}

// PATCH — تحديث كارت (شامل تبديل active وإعادة الترتيب)
export async function PATCH(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminWaniPartnerCardPatchSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, ...rest } = parsed.data;

  const current = await prisma.waniPartnerCard.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });

  const updated = await prisma.waniPartnerCard.update({
    where: { id },
    data: rest,
  });

  return NextResponse.json(updated);
}

// DELETE — حذف كارت
export async function DELETE(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminWaniPartnerCardDeleteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await prisma.waniPartnerCard.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
