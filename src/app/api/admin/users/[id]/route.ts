import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── PATCH /api/admin/users/[id] — تعديل الـ plan أو isBetaUser flag ─────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  // لو الـ body جاي بـ isBetaUser بس → toggle الـ flag فقط
  if (typeof body.isBetaUser === "boolean" && !body.plan && body.aiExtraCredits === undefined) {
    await prisma.subscription.upsert({
      where:  { userId: id },
      update: { isBetaUser: body.isBetaUser },
      create: {
        userId:                 id,
        plan:                   "free",
        status:                 "active",
        isBetaUser:             body.isBetaUser,
        periodResetAt:          new Date(),
        campaignsUsedThisMonth: 0,
      },
    });
    return NextResponse.json({ success: true });
  }

  // لو الـ body جاي بـ aiExtraCredits → تعديل كريديتس الـ AI
  if (typeof body.aiExtraCredits === "number" && !body.plan) {
    const delta = Math.round(body.aiExtraCredits); // الفرق المراد إضافته أو طرحه
    if (isNaN(delta))
      return NextResponse.json({ error: "aiExtraCredits يجب أن يكون رقمًا" }, { status: 400 });

    await prisma.subscription.upsert({
      where:  { userId: id },
      update: { aiExtraCredits: { increment: delta } },
      create: {
        userId:                id,
        plan:                  "free",
        status:                "active",
        aiExtraCredits:        Math.max(0, delta),
        periodResetAt:         new Date(),
        campaignsUsedThisMonth: 0,
      },
    });
    return NextResponse.json({ success: true });
  }

  // غير ذلك → تعديل الـ plan العادي
  const { plan } = body;
  if (!plan)
    return NextResponse.json({ error: "plan أو isBetaUser مطلوب" }, { status: 400 });

  // لو بنرقّي لـ enterprise، نضع الـ aiPlanCredits = 1_000_000 تلقائياً
  const extraData = plan === "enterprise" ? { aiPlanCredits: 1_000_000 } : {};

  await prisma.subscription.upsert({
    where:  { userId: id },
    update: { plan, ...extraData },
    create: {
      userId:                id,
      plan,
      status:                "active",
      periodResetAt:         new Date(),
      campaignsUsedThisMonth: 0,
      ...extraData,
    },
  });

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/admin/users/[id] — soft delete (مش hard delete) ─────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await guardSuper();
  if (!session)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;

  // منع حذف الـ super admin نفسه
  if (id === session.user.id)
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { isSuper: true, deletedAt: true },
  });
  if (!target)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (target.isSuper)
    return NextResponse.json({ error: "لا يمكن حذف super admin" }, { status: 400 });
  if (target.deletedAt)
    return NextResponse.json({ error: "المستخدم محذوف بالفعل" }, { status: 409 });

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}

// ─── PUT /api/admin/users/[id] — restore يوزر محذوف ──────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await guardSuper();
  if (!session)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (!body.restore)
    return NextResponse.json({ error: "أرسل { restore: true }" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { deletedAt: true },
  });
  if (!target)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (!target.deletedAt)
    return NextResponse.json({ error: "المستخدم غير محذوف" }, { status: 409 });

  await prisma.user.update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
  });

  return NextResponse.json({ success: true });
}