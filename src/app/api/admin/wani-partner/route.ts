// src/app/api/admin/wani-partner/route.ts
// تاب "WANI Partner" في /dashboard/admin — قائمة كل الكروت اللي اليوزرز
// بعتوها (pending/approved/rejected)، والأدمن بيقبل/يرفض/يرتّب من هنا.
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

// GET — كل الكروت (كل الحالات)، pending الأول عشان تتراجع بسرعة
export async function GET() {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cards = await prisma.waniPartnerCard.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true, brandName: true } },
    },
  });

  // pending الأول، بعدين approved، بعدين rejected
  const priority: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
  cards.sort((a: { status: string }, b: { status: string }) => priority[a.status] - priority[b.status]);

  return NextResponse.json(cards);
}

// POST — كارت رسمي بيضيفه الأدمن مباشرة لحسابه، بيتعتمد أوتوماتيك (بدون مراجعة لنفسه)
export async function POST(req: NextRequest) {
  const session = await requireSuper();
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminCreateWaniPartnerCardSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const count = await prisma.waniPartnerCard.count({ where: { userId: session.user.id } });
  if (count >= 10) return NextResponse.json({ error: "مسموح بحد أقصى 10 كروت" }, { status: 409 });

  const card = await prisma.waniPartnerCard.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
    },
  });

  return NextResponse.json(card, { status: 201 });
}

// PATCH — قبول/رفض الكارت، أو أي تعديل إداري (ترتيب، تفعيل، تعديل محتوى)
export async function PATCH(req: NextRequest) {
  const session = await requireSuper();
  if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminWaniPartnerCardPatchSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id, status, rejectionReason, ...rest } = parsed.data;

  const current = await prisma.waniPartnerCard.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });

  const data: Record<string, unknown> = { ...rest };
  if (status) {
    data.status = status;
    data.reviewedAt = new Date();
    data.reviewedBy = session.user.id;
    data.rejectionReason = status === "rejected" ? (rejectionReason ?? null) : null;
  } else if (rejectionReason !== undefined) {
    data.rejectionReason = rejectionReason;
  }

  const updated = await prisma.waniPartnerCard.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — الأدمن يقدر يمسح أي كارت (إجراء رقابي)
export async function DELETE(req: NextRequest) {
  const session = await requireSuper();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = parseInput(AdminWaniPartnerCardDeleteSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await prisma.waniPartnerCard.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
