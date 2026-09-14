import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  addAITokensBonus,
  activateAgentBeta,
  getAgentBetaStatus,
  AGENT_BETA_TOKENS,
  AGENT_BETA_MS,
} from "@/lib/plan-guard";

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

  // ── Agent Beta Access (أدمن): تفعيل لمرة واحدة لأي يوزر ───────────────
  // body: { agentBeta: "activate" }
  // الأدمن يتجاوز شرط ربط الواتساب (منح يدوي مقصود) — لكن يظل محظوراً لـ Max
  // ولمن استهلكها من قبل (استخدم "reset" لمنحه فرصة جديدة).
  if (body.agentBeta === "activate") {
    const result = await activateAgentBeta(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason, reason: result.reason },
        { status: 409 }
      );
    }
    const beta = await getAgentBetaStatus(id);
    return NextResponse.json({ success: true, reason: result.reason, beta });
  }

  // ── Agent Beta Access (أدمن): تصفير ومنح جديد (5 أيام / 30K من الآن) ───
  // body: { agentBeta: "reset" }
  // لليوزر اللي خلص تجربته وعايز الأدمن يديله فرصة تانية — أو لإلغاء التفعيل
  // الخاطئ. يُستخدم بحذر: يمسح الاستهلاك السابق.
  if (body.agentBeta === "reset") {
    const target = await prisma.subscription.findUnique({
      where: { userId: id },
      select: { plan: true },
    });
    if ((target?.plan as string) === "enterprise") {
      return NextResponse.json(
        { error: "is_enterprise", reason: "is_enterprise" },
        { status: 409 }
      );
    }
    const now = new Date();
    await prisma.subscription.upsert({
      where: { userId: id },
      update: {
        agentBetaStartedAt: now,
        agentBetaEndsAt: new Date(now.getTime() + AGENT_BETA_MS),
        agentBetaTokensLimit: AGENT_BETA_TOKENS,
        agentBetaTokensUsed: 0,
        agentBetaConsumed: true,
        agentBetaExpiredNotifiedAt: null,
      },
      create: {
        userId: id, plan: "free", status: "active",
        periodResetAt: now, campaignsUsedThisMonth: 0,
        aiTokensUsedThisMonth: 0, aiTokensBonusBalance: 0,
        agentBetaStartedAt: now,
        agentBetaEndsAt: new Date(now.getTime() + AGENT_BETA_MS),
        agentBetaTokensLimit: AGENT_BETA_TOKENS,
        agentBetaTokensUsed: 0,
        agentBetaConsumed: true,
      },
    });
    const beta = await getAgentBetaStatus(id);
    return NextResponse.json({ success: true, reason: "reset", beta });
  }

  // ── Agent Beta Access (أدمن): إلغاء التفعيل الساري (يقفل الاستخدام فوراً) ─
  // body: { agentBeta: "revoke" } — ينهي المدة الآن مع الاحتفاظ consumed=true
  // (الإعدادات محفوظة، والاستهلاك السابق ظاهر).
  if (body.agentBeta === "revoke") {
    await prisma.subscription.updateMany({
      where: { userId: id, agentBetaConsumed: true },
      data: { agentBetaEndsAt: new Date() },
    });
    const beta = await getAgentBetaStatus(id);
    return NextResponse.json({ success: true, reason: "revoked", beta });
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