import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addAITokensBonus } from "@/lib/plan-guard";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── PATCH /api/admin/users/[id] — تعديل الـ plan أو isBetaUser أو AI bonus ──
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  // toggle isBetaUser فقط
  if (typeof body.isBetaUser === "boolean" && !body.plan && body.aiTokensBonus === undefined) {
    await prisma.subscription.upsert({
      where:  { userId: id },
      update: { isBetaUser: body.isBetaUser },
      create: {
        userId: id, plan: "free", status: "active", isBetaUser: body.isBetaUser,
        periodResetAt: new Date(), campaignsUsedThisMonth: 0,
        aiTokensUsedThisMonth: 0, aiTokensBonusBalance: 0,
      },
    });
    return NextResponse.json({ success: true });
  }

  // إضافة bonus tokens للـ AI — بتاخد صلاحية 30 يوم زي أي رصيد توكنز مشترى
  // (نفس منطق addAITokensBonus في src/lib/plan-guard.ts)
  if (typeof body.aiTokensBonus === "number" && body.aiTokensBonus > 0) {
    await addAITokensBonus(id, body.aiTokensBonus);
    return NextResponse.json({ success: true });
  }

  // reset bonus tokens (لو الأدمن حب يصفّر)
  if (body.resetAiBonus === true) {
    await prisma.subscription.update({
      where: { userId: id },
      data:  { aiTokensBonusBalance: 0, aiTokensBonusExpiresAt: null },
    });
    return NextResponse.json({ success: true });
  }

  // تعديل الـ plan العادي
  const { plan } = body;
  if (!plan)
    return NextResponse.json({ error: "plan أو isBetaUser أو aiTokensBonus مطلوب" }, { status: 400 });

  await prisma.subscription.upsert({
    where:  { userId: id },
    update: { plan },
    create: {
      userId: id, plan, status: "active",
      periodResetAt: new Date(), campaignsUsedThisMonth: 0,
      aiTokensUsedThisMonth: 0, aiTokensBonusBalance: 0,
    },
  });

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/admin/users/[id] — حذف المستخدم نهائياً من قاعدة البيانات ───
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
    select: { isSuper: true },
  });
  if (!target)
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (target.isSuper)
    return NextResponse.json({ error: "لا يمكن حذف super admin" }, { status: 400 });

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    prisma.user.updateMany({ where: { parentId: id }, data: { parentId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true, id });
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