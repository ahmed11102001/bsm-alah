// src/app/api/wani-partner/mine/route.ts
// كل يوزر بيدير كارته الخاص هنا (كارت واحد بس لكل يوزر). أي تعديل في المحتوى
// بيرجّع حالة الكارت pending تاني عشان يتراجع من الأدمن — التفعيل/الإيقاف
// بس هو اللي مش محتاج مراجعة.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  UserWaniPartnerCardSchema, UserWaniPartnerActiveSchema, parseInput,
} from "@/lib/schemas";

// GET — كارت اليوزر الحالي (أو null لو لسه معملش)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const card = await prisma.waniPartnerCard.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(card);
}

// PUT — إنشاء الكارت لأول مرة أو تعديل محتواه (بيرجّعه pending)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(UserWaniPartnerCardSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const card = await prisma.waniPartnerCard.upsert({
    where: { userId: session.user.id },
    create: {
      ...parsed.data,
      userId: session.user.id,
      status: "pending",
    },
    update: {
      ...parsed.data,
      status: "pending",
      rejectionReason: null,
      reviewedAt: null,
      reviewedBy: null,
    },
  });

  return NextResponse.json(card);
}

// PATCH — تشغيل/إيقاف الكارت بس (من غير ما يرجع لمراجعة الأدمن)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const parsed = parseInput(UserWaniPartnerActiveSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.waniPartnerCard.findUnique({ where: { userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "لسه معملتش كارت" }, { status: 404 });

  const card = await prisma.waniPartnerCard.update({
    where: { userId: session.user.id },
    data: { active: parsed.data.active },
  });

  return NextResponse.json(card);
}

// DELETE — مسح كارت اليوزر نفسه
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const existing = await prisma.waniPartnerCard.findUnique({ where: { userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "لسه معملتش كارت" }, { status: 404 });

  await prisma.waniPartnerCard.delete({ where: { userId: session.user.id } });
  return NextResponse.json({ success: true });
}
