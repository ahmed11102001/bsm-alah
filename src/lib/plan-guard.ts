// src/lib/plan-guard.ts
// ─── Guard مركزي للتحقق من حدود الباقة قبل أي عملية ─────────────────────────
// كل API route يستدعي الدوال من هنا — مفيش منطق حدود مكرر في أي مكان.

import prisma from "@/lib/prisma";
import {
  PLANS, PLAN_NAMES, FEATURE_REQUIRED_PLAN, planAtLeast,
  isUnlimited, limitLabel,
  type PlanTier,
} from "@/lib/plans";
import { notifyPlanLimitReached, notifyAgentBetaEnded } from "@/lib/notifications";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GuardResult =
  | { allowed: true }
  | {
    allowed: false;
    code: "LIMIT_REACHED" | "FEATURE_LOCKED" | "NO_SUBSCRIPTION";
    message: string;          // رسالة للعرض في الـ UI
    plan: PlanTier;        // الباقة الحالية
    requiredPlan?: PlanTier;  // الباقة اللي محتاج ترقية ليها
    limit?: number;          // الحد الأقصى
    used?: number;          // الاستهلاك الحالي
  };

// ─── Helper: جلب اشتراك المالك ───────────────────────────────────────────────
// ownerId = parentId لو sub-account, وإلا userId نفسه
async function getSubscription(ownerId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      plan: true,
      status: true,
      isBetaUser: true,  // ← internal flag
      campaignsUsedThisMonth: true,
      periodResetAt: true,
      currentPeriodEnd: true,  // ← لازم نتشيك عليه لمعرفة انتهاء الاشتراك
    },
  });

  // ── Self-healing downgrade ──────────────────────────────────────────────
  // getEffectivePlan() بيمنع استخدام أي ميزة مدفوعة فورًا لحظة ما currentPeriodEnd
  // يعدّي (بغض النظر عن قيمة plan/status المخزّنة)، لكن لو سبنا الـDB على حالها
  // لحد ما يشتغل الـcron اليومي (expireSubscriptionsDaily)، الواجهات اللي بتقرا
  // sub.plan مباشرة (لوحة التحكم، صفحة الفوترة، لوحة الأدمن) هتفضل عارضة باقة
  // قديمة غير صحيحة لحد 24 ساعة. هنا بنصفّر القيمة فعليًا في الـDB أول تحقق
  // صلاحيات بعد الانتهاء، فيبقى مفيش فرق بين الصلاحية الفعلية والمعروضة أبدًا —
  // الـcron يفضل شغال كـshelf-net إضافي بس مش المصدر الوحيد.
  if (
    sub &&
    sub.status === "active" &&
    sub.plan !== "free" &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd < new Date()
  ) {
    await prisma.subscription
      .update({
        where: { userId: ownerId },
        data: { plan: "free", status: "expired" },
      })
      .catch((err: unknown) => console.error("[PlanGuard] فشل التصفير الفوري للباقة المنتهية:", err));
    sub.plan = "free";
    sub.status = "expired";
  }

  return sub;
}

/** لو مفيش subscription نرجع free كـ fallback */
function safePlan(sub: { plan: string } | null): PlanTier {
  if (!sub) return "free";
  return sub.plan as PlanTier;
}

/**
 * بيرجع الباقة الفعلية للمستخدم مع مراعاة:
 * - لو status = expired أو cancelled → free
 * - لو currentPeriodEnd عدى → free (حتى لو status لسه active في الـ DB)
 * - لو free plan (currentPeriodEnd = null) → free للأبد
 */
function getEffectivePlan(
  sub: { plan: string; status: string; currentPeriodEnd: Date | null } | null
): PlanTier {
  if (!sub) return "free";

  // اشتراك منتهي أو ملغي صراحةً
  if (sub.status === "expired" || sub.status === "cancelled") return "free";

  // الباقة المجانية مفيهاش تاريخ انتهاء — تفضل شغالة
  if (!sub.currentPeriodEnd) return sub.plan as PlanTier;

  // لو تاريخ الانتهاء عدى → treat كـ free حتى يجدد
  if (sub.currentPeriodEnd < new Date()) return "free";

  return sub.plan as PlanTier;
}

// ─── دورة الاستهلاك الشهري = 30 يوم بالظبط ─────────────────────────────────
const USAGE_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Helper: تصفير العداد الشهري لو عدّت 30 يوم من آخر تصفير ────────────────
// ملحوظة مهمة: التصفير هنا بقى مبني على "30 يوم فعلية من تاريخ آخر تصفير
// لليوزر ده تحديدًا" (periodResetAt + 30 يوم) — مش على تغيّر الشهر الميلادي.
// كده كل يوزر بقى ليه دورة استهلاك خاصة بيه تبدأ من تاريخ اشتراكه/آخر تصفير،
// مش متزامنة مع أول كل شهر ميلادي لكل المستخدمين مع بعض.
async function resetMonthlyCounterIfNeeded(ownerId: string, periodResetAt: Date) {
  const now = new Date();
  const resetDate = new Date(periodResetAt);

  // لو عدّى 30 يوم بالظبط من آخر تصفير → صفّر العداد وابدأ دورة جديدة من دلوقتي
  if (now.getTime() - resetDate.getTime() >= USAGE_CYCLE_MS) {
    await prisma.subscription.update({
      where: { userId: ownerId },
      data: {
        campaignsUsedThisMonth: 0,
        aiTokensUsedThisMonth: 0,        // ← reset كل 30 يوم للتوكن
        mcpCommandsUsedThisMonth: 0,     // ← reset كل 30 يوم لأوامر MCP (كان ناقص، وده كان بيخلي
        //   checkFeature يتعامل مع القيمة كـ "متصفّرة" محليًا
        //   من غير ما تتصفّر فعليًا في الداتابيز)
        periodResetAt: now,
      },
    });
    return 0;
  }
  return null; // لم يتم التصفير
}

// ─── Helper: تصفير رصيد التوكنز الإضافي (bonus) لو عدّت 30 يوم على شرائه ────
// اليوزر لما يشتري باقة توكنز، بيتحدد لها تاريخ انتهاء = تاريخ الشراء + 30 يوم
// (aiTokensBonusExpiresAt). هنا بنتأكد إنه لو التاريخ ده عدى ولسه فيه رصيد،
// بنصفّره فورًا — نفس فكرة الـSelf-healing المستخدمة مع انتهاء الباقة نفسها.
async function expireBonusTokensIfNeeded(
  ownerId: string,
  bonusBalance: number,
  bonusExpiresAt: Date | null
): Promise<number> {
  if (bonusBalance > 0 && bonusExpiresAt && bonusExpiresAt < new Date()) {
    await prisma.subscription
      .update({
        where: { userId: ownerId },
        data: { aiTokensBonusBalance: 0, aiTokensBonusExpiresAt: null },
      })
      .catch((err: unknown) => console.error("[PlanGuard] فشل تصفير رصيد التوكنز المنتهي:", err));
    return 0;
  }
  return bonusBalance;
}

// ─── Helper: هل اليوزر ده superadmin أو beta user؟ ───────────────────────────
async function isSuperAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuper: true } });
  return u?.isSuper ?? false;
}

/** Beta users يحصلوا على enterprise-level access بدون ما plan بتاعهم يتغير */
async function isBetaBypass(ownerId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { isBetaUser: true },
  });
  return sub?.isBetaUser ?? false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Beta Access — تجربة إيجنت وني 5 أيام / 30K توكن (Gemini فقط)
// ─────────────────────────────────────────────────────────────────────────────
// القواعد:
// - لعملاء Free/Go/Pro فقط (Max يمتلك الـ Agent أصلاً فلا يدخل).
// - لمرة واحدة فقط (agentBetaConsumed) — التفعيل بزر من المساعد الذكي.
// - العداد يبدأ من لحظة الضغط على التفعيل، لا من ظهور التنبيه.
// - الباقة الأصلية بكل حدودها تظل كما هي — الاستثناء الوحيد هو aiAgent.
// - 5 أيام OR 30K توكن — أيهما الأول.
// ═══════════════════════════════════════════════════════════════════════════════
export const AGENT_BETA_DAYS = 5;
export const AGENT_BETA_TOKENS = 30_000;
const AGENT_BETA_MS = AGENT_BETA_DAYS * 24 * 60 * 60 * 1000;

export type AgentBetaStatus = {
  active: boolean;
  consumed: boolean;
  reason: "inactive" | "active" | "expired" | "tokens_exhausted" | "is_enterprise" | "no_subscription";
  startedAt: Date | null;
  endsAt: Date | null;
  limit: number;
  used: number;
  remaining: number;
  daysLeft: number;
};

export async function getAgentBetaStatus(ownerId: string): Promise<AgentBetaStatus> {
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      plan: true,
      agentBetaStartedAt: true,
      agentBetaEndsAt: true,
      agentBetaTokensLimit: true,
      agentBetaTokensUsed: true,
      agentBetaConsumed: true,
    },
  });
  if (!sub) {
    return {
      active: false, consumed: false, reason: "no_subscription",
      startedAt: null, endsAt: null,
      limit: AGENT_BETA_TOKENS, used: 0, remaining: AGENT_BETA_TOKENS, daysLeft: 0,
    };
  }
  // Max يمتلك الـ Agent أصلاً — لا يدخل البيتا
  if ((sub.plan as string) === "enterprise") {
    return {
      active: false, consumed: sub.agentBetaConsumed, reason: "is_enterprise",
      startedAt: sub.agentBetaStartedAt, endsAt: sub.agentBetaEndsAt,
      limit: sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS,
      used: sub.agentBetaTokensUsed ?? 0,
      remaining: Math.max(0, (sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS) - (sub.agentBetaTokensUsed ?? 0)),
      daysLeft: 0,
    };
  }
  if (!sub.agentBetaConsumed || !sub.agentBetaStartedAt || !sub.agentBetaEndsAt) {
    return {
      active: false, consumed: sub.agentBetaConsumed, reason: "inactive",
      startedAt: sub.agentBetaStartedAt, endsAt: sub.agentBetaEndsAt,
      limit: sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS,
      used: sub.agentBetaTokensUsed ?? 0,
      remaining: (sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS) - (sub.agentBetaTokensUsed ?? 0),
      daysLeft: 0,
    };
  }
  const now = new Date();
  const limit = sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS;
  const used = sub.agentBetaTokensUsed ?? 0;
  if (used >= limit) {
    return {
      active: false, consumed: true, reason: "tokens_exhausted",
      startedAt: sub.agentBetaStartedAt, endsAt: sub.agentBetaEndsAt,
      limit, used, remaining: 0, daysLeft: 0,
    };
  }
  if (now >= new Date(sub.agentBetaEndsAt)) {
    return {
      active: false, consumed: true, reason: "expired",
      startedAt: sub.agentBetaStartedAt, endsAt: sub.agentBetaEndsAt,
      limit, used, remaining: Math.max(0, limit - used), daysLeft: 0,
    };
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(sub.agentBetaEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );
  return {
    active: true, consumed: true, reason: "active",
    startedAt: sub.agentBetaStartedAt, endsAt: sub.agentBetaEndsAt,
    limit, used, remaining: Math.max(0, limit - used), daysLeft,
  };
}

/** هل البيتا سارية الآن؟ (تُستخدم لفتح aiAgent فقط — باقي الحدود لا تتأثر) */
export async function isAgentBetaActive(ownerId: string): Promise<boolean> {
  // السوبر أدمن والبيتا الداخلي مفتوح لهم كل شيء أصلاً عبر isBetaBypass
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return true;
  return (await getAgentBetaStatus(ownerId)).active;
}

/**
 * تفعيل Agent Beta Access — لحظة بداية الـ 5 أيام.
 * تُستدعى مرة واحدة من زر المساعد الذكي. ترجع false لو غير مؤهل.
 */
export async function activateAgentBeta(ownerId: string): Promise<{ ok: boolean; reason: string; endsAt?: Date }> {
  if (await isSuperAdmin(ownerId)) return { ok: false, reason: "is_super_admin" };
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      plan: true, agentBetaConsumed: true,
      agentBetaStartedAt: true, agentBetaEndsAt: true,
      agentBetaTokensUsed: true, agentBetaTokensLimit: true,
    },
  });
  // Max يمتلك الـ Agent أصلاً
  const plan = (sub?.plan as string) ?? "free";
  if (plan === "enterprise") return { ok: false, reason: "is_enterprise" };
  // لمرة واحدة فقط
  if (sub?.agentBetaConsumed) {
    // لو سارية فعلاً ارجع نهايتها الحالية بدل خطأ
    if (sub.agentBetaEndsAt && new Date(sub.agentBetaEndsAt) > new Date() &&
        (sub.agentBetaTokensUsed ?? 0) < (sub.agentBetaTokensLimit ?? AGENT_BETA_TOKENS)) {
      return { ok: true, reason: "already_active", endsAt: sub.agentBetaEndsAt };
    }
    return { ok: false, reason: "already_consumed" };
  }
  const now = new Date();
  const endsAt = new Date(now.getTime() + AGENT_BETA_MS);
  await prisma.subscription.upsert({
    where: { userId: ownerId },
    update: {
      agentBetaStartedAt: now,
      agentBetaEndsAt: endsAt,
      agentBetaTokensLimit: AGENT_BETA_TOKENS,
      agentBetaTokensUsed: 0,
      agentBetaConsumed: true,
      agentBetaExpiredNotifiedAt: null,
    },
    create: {
      userId: ownerId, plan: "free", status: "active",
      periodResetAt: now, campaignsUsedThisMonth: 0,
      aiTokensUsedThisMonth: 0, aiTokensBonusBalance: 0,
      agentBetaStartedAt: now,
      agentBetaEndsAt: endsAt,
      agentBetaTokensLimit: AGENT_BETA_TOKENS,
      agentBetaTokensUsed: 0,
      agentBetaConsumed: true,
    },
  });
  return { ok: true, reason: "activated", endsAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Beta token ledger — حجز/خصم ذري (الحماية الفعلية للـ 30K)
// ─────────────────────────────────────────────────────────────────────────────
// المشكلة: نمط check-then-act (فحص ثم توليد ثم خصم) فيه TOCTOU — طلبان
// متزامنان يعدّيان الفحص معاً ويتجاوزان الليميت. الحل: حجز ذري مسبق
// عبر updateMany مشروط (used <= limit - estimated) في statement واحد.
// التدفق الصحيح لكل مسار يستهلك Gemini في البيتا:
//   1. reserveAgentBetaTokens(ownerId, estimated) قبل getAIReply
//      → false = مرفوض فوراً (لا توليد، لا تكلفة)
//   2. بعد getAIReply: settleAgentBetaTokens(ownerId, estimated, actual)
//      → يرد الفرق (refund) أو يخصم الزيادة (delta، محدود بحجم الرد الواحد)
// وبهذا لا يمكن تجاوز الليميت إلا بحد أقصى رد واحد متأخر — وليس بلا سقف.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * حجز ذري لتوكنز البيتا قبل التوليد. يرجع false لو:
 * - البيتا غير سارية (منتهية/مستنفدة/غير مفعّلة)، أو
 * - الرصيد المتبقي لا يكفي الـ estimated (شرط ذري في نفس الـ UPDATE).
 */
export async function reserveAgentBetaTokens(
  ownerId: string,
  estimatedTokens: number
): Promise<{ ok: boolean; reason?: string }> {
  if (estimatedTokens <= 0) return { ok: true };
  const beta = await getAgentBetaStatus(ownerId);
  if (!beta.active) return { ok: false, reason: beta.reason };
  if (beta.remaining < estimatedTokens) return { ok: false, reason: "insufficient" };
  // شرط ذري: لا تحجز إلا لو used الحالي يسمح — يمنع تجاوز السباق
  const claimed = await prisma.subscription.updateMany({
    where: {
      userId: ownerId,
      agentBetaConsumed: true,
      agentBetaEndsAt: { gt: new Date() },
      agentBetaTokensUsed: { lte: beta.limit - estimatedTokens },
    },
    data: { agentBetaTokensUsed: { increment: estimatedTokens } },
  });
  if (claimed.count === 0) {
    // خسر السباق الذري (حد تاني حجز أولاً) — أعد القراءة للسبب الدقيق
    const fresh = await getAgentBetaStatus(ownerId);
    return { ok: false, reason: fresh.active ? "insufficient" : fresh.reason };
  }
  return { ok: true };
}

/**
 * تسوية بعد التوليد: estimated كان محجوزاً مسبقاً.
 * - actual < estimated → refund الفرق (decrement، بحد أدنى 0 عبر clamp لاحق).
 * - actual > estimated → خصم delta (قد يتجاوز الليميت بحد أقصى حجم رد واحد فقط).
 * - actual == estimated → لا شيء.
 */
export async function settleAgentBetaTokens(
  ownerId: string,
  estimatedTokens: number,
  actualTokens: number
): Promise<void> {
  const delta = actualTokens - estimatedTokens;
  if (delta === 0) return;
  try {
    if (delta < 0) {
      await prisma.subscription.updateMany({
        where: { userId: ownerId, agentBetaTokensUsed: { gte: -delta } },
        data: { agentBetaTokensUsed: { decrement: -delta } },
      });
    } else {
      await prisma.subscription.update({
        where: { userId: ownerId },
        data: { agentBetaTokensUsed: { increment: delta } },
      });
    }
    // إشعار فوري عند النفاد (مرة واحدة) — لا تنتظر cron اليومي
    const beta = await getAgentBetaStatus(ownerId);
    if (beta.reason === "tokens_exhausted") {
      const claim = await prisma.subscription.updateMany({
        where: { userId: ownerId, agentBetaExpiredNotifiedAt: null },
        data: { agentBetaExpiredNotifiedAt: new Date() },
      });
      if (claim.count) {
        notifyAgentBetaEnded(ownerId, "tokens_exhausted").catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[AGENT-BETA] settle failed for ${ownerId}:`, err);
  }
}

/** مسار قديم/احتياطي: خصم مباشر بعد التوليد (يُستخدم فقط لو الحجز المسبق تعذّر).
 *  مفضل دائماً استخدام reserve→settle. يُبقي الشرط الذري lte لمنع التجاوز الصامت. */
export async function consumeAgentBetaTokensAtomic(
  ownerId: string,
  tokens: number
): Promise<boolean> {
  if (tokens <= 0) return true;
  const beta = await getAgentBetaStatus(ownerId);
  if (!beta.active) return false;
  const claimed = await prisma.subscription.updateMany({
    where: {
      userId: ownerId,
      agentBetaConsumed: true,
      agentBetaEndsAt: { gt: new Date() },
      agentBetaTokensUsed: { lte: beta.limit - tokens },
    },
    data: { agentBetaTokensUsed: { increment: tokens } },
  });
  return claimed.count > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. checkContactsLimit — قبل إضافة جهة اتصال أو جمهور
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkContactsLimit(
  ownerId: string,
  addingCount = 1
): Promise<GuardResult> {
  const status = await getContactsLimitStatus(ownerId);
  if (status.unlimited || status.available >= addingCount) return { allowed: true };

  if (addingCount > 0) {
    await notifyPlanLimitReached(ownerId, "contacts");
    return {
      allowed: false,
      code: "LIMIT_REACHED", message: status.message,
      plan: status.plan, requiredPlan: nextPlan(status.plan), limit: status.limit, used: status.used,
    };
  }

  return { allowed: true };
}

export type ContactsLimitStatus = {
  plan: PlanTier;
  limit: number;
  used: number;
  available: number;
  unlimited: boolean;
  message: string;
};

/** نفس مصدر الحقيقة المستخدم في checkContactsLimit، مع بيانات العرض للـ import preview. */
export async function getContactsLimitStatus(ownerId: string): Promise<ContactsLimitStatus> {
  const unlimitedPlan = (await isSuperAdmin(ownerId)) || (await isBetaBypass(ownerId));
  const sub = await getSubscription(ownerId);
  const plan = unlimitedPlan ? "enterprise" : getEffectivePlan(sub);
  const limit = PLANS[plan].contacts;
  const used = await prisma.contact.count({ where: { userId: ownerId, deletedAt: null } });
  const unlimited = unlimitedPlan || isUnlimited(limit);
  return {
    plan, limit, used,
    available: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, limit - used),
    unlimited,
    message: unlimited
      ? ""
      : used >= limit
        ? `لقد وصلت إلى الحد الأقصى لجهات الاتصال في باقة ${PLAN_NAMES[plan]}. قم بحذف بعض جهات الاتصال أو قم بترقية الباقة لإضافة المزيد.`
        : `وصلت للحد الأقصى للإجمالي (${limitLabel(limit)} جهة اتصال) في باقة ${PLAN_NAMES[plan]}. قم بالترقية لإضافة المزيد.`,
  };
}

/** قفل PostgreSQL قصير المدى لتسلسل imports التي تتحقق من نفس global limit. */
export async function acquireContactsLimitLock(tx: any, ownerId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. checkCampaignsLimit — قبل إنشاء حملة
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkCampaignsLimit(ownerId: string): Promise<GuardResult> {
  // ✅ السوبر أدمن وبيتا يوزرز مفيش عليهم قيود
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const limit = PLANS[plan].campaignsPerMonth;

  if (isUnlimited(limit)) return { allowed: true };

  // تصفير العداد لو بدأ شهر جديد
  let used = sub?.campaignsUsedThisMonth ?? 0;
  if (sub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, sub.periodResetAt);
    if (reset !== null) used = 0;
  }

  if (used >= limit) {
    await notifyPlanLimitReached(ownerId, "campaignsPerMonth");
    return {
      allowed: false,
      code: "LIMIT_REACHED",
      message: `استهلكت كل الحملات المتاحة هذا الشهر (${limitLabel(limit)} حملة) في باقة ${PLAN_NAMES[plan]}. الحد يُجدَّد أول كل شهر أو قم بالترقية.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used,
    };
  }

  return { allowed: true };
}

/** زيادة عداد الحملات بعد الإنشاء الناجح (Deprecated: استخدم consumeCampaignQuotaAtomic لمنع Race Conditions) */
export async function incrementCampaignUsage(ownerId: string): Promise<void> {
  const sub = await getSubscription(ownerId);
  if (!sub) return;
  const plan = getEffectivePlan(sub);
  if (isUnlimited(PLANS[plan].campaignsPerMonth)) return; // غير محدود → مش محتاجين نعد

  await prisma.subscription.update({
    where: { userId: ownerId },
    data: { campaignsUsedThisMonth: { increment: 1 } },
  });
}

/** 
 * خصم حصة حملة بشكل ذري (Atomic) لمنع الـ Race Condition. 
 * يُستخدم بدلاً من check + increment منفصلين.
 */
export async function consumeCampaignQuotaAtomic(ownerId: string): Promise<GuardResult> {
  // 1. حسابات مبدئية وباس للبيتا والسوبر أدمن
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const limit = PLANS[plan].campaignsPerMonth;

  if (isUnlimited(limit)) return { allowed: true };

  // 2. تصفير العداد لو بدأ شهر جديد (نعملها قبل الـ updateMany الذري)
  let used = sub?.campaignsUsedThisMonth ?? 0;
  if (sub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, sub.periodResetAt);
    if (reset !== null) used = 0;
  }

  // 3. Update ذري: نـ increment بشرط إن الـ used لسه أقل من الـ limit
  const updated = await prisma.subscription.updateMany({
    where: {
      userId: ownerId,
      campaignsUsedThisMonth: { lt: limit }
    },
    data: { campaignsUsedThisMonth: { increment: 1 } }
  });

  // لو الـ update مرجعش حاجة، معناه إن الشرط متحققش (وصل للـ limit)
  if (updated.count === 0) {
    await notifyPlanLimitReached(ownerId, "campaignsPerMonth");
    return {
      allowed: false,
      code: "LIMIT_REACHED",
      message: `استهلكت كل الحملات المتاحة هذا الشهر (${limitLabel(limit)} حملة) في باقة ${PLAN_NAMES[plan]}. الحد يُجدَّد أول كل شهر أو قم بالترقية.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used: limit, // استهلك الـ limit بالكامل
    };
  }

  return { allowed: true };
}

/** 
 * استرجاع حصة حملة لو حصل خطأ أثناء إنشائها بعد ما خصمناها 
 */
export async function refundCampaignQuota(ownerId: string): Promise<void> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return;
  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  if (isUnlimited(PLANS[plan].campaignsPerMonth)) return;

  await prisma.subscription.updateMany({
    where: {
      userId: ownerId,
      campaignsUsedThisMonth: { gt: 0 } // متقلش عن 0
    },
    data: { campaignsUsedThisMonth: { decrement: 1 } }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. checkTeamLimit — قبل إضافة عضو فريق
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkTeamLimit(ownerId: string): Promise<GuardResult> {
  // ✅ السوبر أدمن وبيتا يوزرز مفيش عليهم قيود
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const limit = PLANS[plan].teamMembers;

  if (isUnlimited(limit)) return { allowed: true };

  const [currentMembers, pendingInvites] = await Promise.all([
    prisma.user.count({
      where: { parentId: ownerId, deletedAt: null },
    }),
    prisma.teamInvitation.count({
      where: { inviterId: ownerId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);

  const totalTeamSlots = currentMembers + pendingInvites;
  // الـ limit يشمل المالك نفسه — لذلك نقارن بـ (limit - 1)
  const membersLimit = limit - 1;

  if (totalTeamSlots >= membersLimit) {
    return {
      allowed: false,
      code: "LIMIT_REACHED",
      message: `باقة ${PLAN_NAMES[plan]} تسمح بـ ${limitLabel(limit)} مستخدمين فقط (بما فيهم أنت). قم بالترقية لإضافة المزيد.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used: totalTeamSlots + 1, // +1 للمالك
    };
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. checkFeature — للمميزات Boolean
// ═══════════════════════════════════════════════════════════════════════════════
type BooleanFeature = keyof typeof FEATURE_REQUIRED_PLAN;

const FEATURE_LABELS: Record<BooleanFeature, string> = {
  scheduledCampaigns: "الحملات المجدولة",
  advancedReports: "التقارير المتقدمة",
  apiAccess: "الوصول عبر API",
  mediaMessages: "إرسال الوسائط (صور / ملفات / صوت)",
  customAudiences: "الجمهور المخصص",
  storeIntegration: "ربط المتجر والأتمتة",
  aiAgent: "AI Sales Assistant",
  googleSheets: "استيراد ومزامنة Google Sheets",
};

export async function checkFeature(
  ownerId: string,
  feature: BooleanFeature
): Promise<GuardResult> {
  // ✅ السوبر أدمن وبيتا يوزرز مفيش عليهم قيود
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);

  if (PLANS[plan][feature]) return { allowed: true };

  // ── Agent Beta Access: يفتح aiAgent فقط (واجهة الأتمتة/الإعدادات) ──
  // باقي المميزات تظل مقفولة حسب الباقة الأصلية.
  if (feature === "aiAgent") {
    const beta = await getAgentBetaStatus(ownerId);
    if (beta.active) return { allowed: true };
    if (beta.reason === "tokens_exhausted") {
      return {
        allowed: false,
        code: "LIMIT_REACHED",
        message: "انتهت توكنز تجربة Agent Beta Access (30K). رقِّ إلى باقة Max لمتابعة استخدام إيجنت وني.",
        plan,
        requiredPlan: "enterprise",
        limit: beta.limit,
        used: beta.used,
      };
    }
    if (beta.reason === "expired") {
      return {
        allowed: false,
        code: "FEATURE_LOCKED",
        message: "انتهت مدة Agent Beta Access (5 أيام). رقِّ إلى باقة Max لمتابعة استخدام إيجنت وني.",
        plan,
        requiredPlan: "enterprise",
      };
    }
  }

  const required = FEATURE_REQUIRED_PLAN[feature];

  return {
    allowed: false,
    code: "FEATURE_LOCKED",
    message: `ميزة "${FEATURE_LABELS[feature]}" متاحة في باقة ${PLAN_NAMES[required]} وما فوقها. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
    plan,
    requiredPlan: required,
  };
}

/** WANI Partner is an Enterprise-only workspace feature. */
export async function checkEnterpriseAccess(ownerId: string): Promise<GuardResult> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const plan = getEffectivePlan(await getSubscription(ownerId));
  if (plan === "enterprise") return { allowed: true };

  return {
    allowed: false,
    code: "FEATURE_LOCKED",
    message: `ميزة WANI Partner متاحة في باقة Max فقط. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
    plan,
    requiredPlan: "enterprise",
  };
}

// ─── Helper: الباقة التالية ──────────────────────────────────────────────────
function nextPlan(current: PlanTier): PlanTier | undefined {
  const order: PlanTier[] = ["free", "starter", "pro", "enterprise"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : undefined;
}

/** هل يمكن عرض بيانات Agent Beta في صفحة الاستهلاك/الأتمتة؟ (سارية أو مستهلكة) */
export async function canViewAgentBeta(ownerId: string): Promise<boolean> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return true;
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { plan: true, agentBetaConsumed: true },
  });
  if (!sub) return false;
  if ((sub.plan as string) === "enterprise") return true;
  return sub.agentBetaConsumed === true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agent Surface Entitlement — مصدر الحقيقة الوحيد لأسطح الإيجنت الثلاثة
// (واجهة Agent + تفاصيل الاستهلاك + تقارير الأتمتة/AI).
// القاعدة: نفس الدالة تُستخدم في API routes الثلاثة — لا منطق مكرر.
// ═══════════════════════════════════════════════════════════════════════════════
export type AgentSurfaceSource =
  | "internal"      // superadmin أو isBetaUser داخلي — كل شيء مفتوح
  | "enterprise"    // Max — يمتلك الإيجنت أصلاً
  | "beta_active"   // بيتا سارية — استخدام كامل (5 أيام/30K)
  | "beta_history"  // بيتا منتهية — عرض تاريخي فقط (تقارير/استهلاك)، لا استخدام
  | "none";

export type AgentSurfaceAccess = {
  /** هل يحق له *استخدام* الإيجنت (توليد/إعدادات/معاينة)؟ */
  canUse: boolean;
  /** هل يحق له *رؤية* بيانات الإيجنت التاريخية (استهلاك/تقارير)؟ */
  canViewHistory: boolean;
  source: AgentSurfaceSource;
};

export async function getAgentSurfaceAccess(ownerId: string): Promise<AgentSurfaceAccess> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) {
    return { canUse: true, canViewHistory: true, source: "internal" };
  }
  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { plan: true, agentBetaConsumed: true },
  });
  if ((sub?.plan as string) === "enterprise") {
    return { canUse: true, canViewHistory: true, source: "enterprise" };
  }
  const beta = await getAgentBetaStatus(ownerId);
  if (beta.active) {
    return { canUse: true, canViewHistory: true, source: "beta_active" };
  }
  if (beta.consumed) {
    // انتهت (مدة أو توكنز): الإعدادات محفوظة والتاريخ مرئي — لكن لا استخدام جديد.
    return { canUse: false, canViewHistory: true, source: "beta_history" };
  }
  return { canUse: false, canViewHistory: false, source: "none" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. getPlanStatus — للعرض في الداشبورد (بيُستخدم في الـ UI لاحقاً)
// ═══════════════════════════════════════════════════════════════════════════════
export async function getPlanStatus(ownerId: string) {
  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const limits = PLANS[plan];

  // تصفير العداد لو لزم
  let campaignsUsed = sub?.campaignsUsedThisMonth ?? 0;
  if (sub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, sub.periodResetAt);
    if (reset !== null) campaignsUsed = 0;
  }

  const [totalContacts, teamCount, pendingInvites] = await Promise.all([
    prisma.contact.count({
      where: { userId: ownerId, deletedAt: null },
    }),
    prisma.user.count({ where: { parentId: ownerId, deletedAt: null } }),
    prisma.teamInvitation.count({
      where: { inviterId: ownerId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);

  // هل الاشتراك منتهي؟ (status أو currentPeriodEnd)
  const isSubscriptionExpired =
    sub?.status === "expired" ||
    sub?.status === "cancelled" ||
    (!!sub?.currentPeriodEnd && sub.currentPeriodEnd < new Date());

  return {
    plan,                                           // الباقة الفعلية (free لو منتهي)
    originalPlan: (sub?.plan ?? "free") as PlanTier, // الباقة الأصلية في الـ DB
    planName: PLAN_NAMES[plan],
    isBetaUser: sub?.isBetaUser ?? false,     // ← internal flag للـ UI
    status: sub?.status ?? "active",
    isExpired: isSubscriptionExpired,         // ← للـ UI يعرض banner "اشتراكك انتهى"
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    limits,
    // ── Agent Beta Access (تُقرأ من الداشبورد/الأتمتة/المساعد) ──
    // ملحوظة: الباقة وحدودها لا تتغير — البيتا تفتح aiAgent فقط.
    agentBeta: await getAgentBetaStatus(ownerId),
    usage: {
      contacts: totalContacts,
      teamMembers: teamCount + pendingInvites + 1,
      campaignsThisMonth: campaignsUsed,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// 7. checkMCPCommandsLimit — قبل كل Claude MCP command
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkMCPCommandsLimit(ownerId: string): Promise<GuardResult> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId)) return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const limit = PLANS[plan].mcpCommandsPerMonth;

  // 0 = disabled (free / starter)
  if (limit === 0) return {
    allowed: false,
    code: "FEATURE_LOCKED",
    message: `ميزة Claude AI متاحة في باقة Pro وما فوقها. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
    plan,
    requiredPlan: "pro",
  };

  if (isUnlimited(limit)) return { allowed: true };

  // Count this month usage
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const fullSub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { mcpCommandsUsedThisMonth: true, periodResetAt: true },
  });

  let used = fullSub?.mcpCommandsUsedThisMonth ?? 0;
  if (fullSub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, fullSub.periodResetAt);
    if (reset !== null) used = 0;
  }

  if (used >= limit) {
    return {
      allowed: false,
      code: "LIMIT_REACHED",
      message: `استهلكت كل أوامر Claude المتاحة هذا الشهر (${limit} أمر). قم بالترقية لباقة Max للحصول على أوامر غير محدودة.`,
      plan,
      requiredPlan: "enterprise",
      limit,
      used,
    };
  }

  return { allowed: true };
}

/** زيادة عداد MCP commands بعد كل تنفيذ ناجح */
export async function incrementMCPCommandUsage(ownerId: string): Promise<void> {
  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  if (isUnlimited(PLANS[plan].mcpCommandsPerMonth)) return;
  if (PLANS[plan].mcpCommandsPerMonth === 0) return;

  await prisma.subscription.update({
    where: { userId: ownerId },
    data: { mcpCommandsUsedThisMonth: { increment: 1 } },
  });
}

/** إعادة ضبط عداد MCP — تستخدم عند الترقية */
export async function addMCPCommandsBonus(ownerId: string, count: number): Promise<void> {
  await prisma.subscription.update({
    where: { userId: ownerId },
    data: { mcpCommandsUsedThisMonth: { decrement: count } }, // نخصم من الاستهلاك
  });
}

// ─── Shorthand: تحويل GuardResult لـ NextResponse مباشرة ────────────────────
import { NextResponse } from "next/server";

export function guardResponse(result: GuardResult): NextResponse | null {
  if (result.allowed) return null; // مفيش مشكلة — كمّل
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      plan: result.plan,
      requiredPlan: result.requiredPlan,
      limit: result.limit,
      used: result.used,
    },
    { status: 403 }
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// 6. checkAITokensLimit — قبل كل AI call
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkAITokensLimit(
  ownerId: string,
  estimatedTokens = 1500
): Promise<GuardResult> {
  if (await isSuperAdmin(ownerId) || await isBetaBypass(ownerId))
    return { allowed: true };

  const sub = await getSubscription(ownerId);
  const plan = getEffectivePlan(sub);
  const monthlyLimit = PLANS[plan].aiTokensPerMonth;

  // ── Agent Beta Access: عداد معزول 30K — لا يخصم من أي رصيد آخر ──
  // لو الباقة نفسها فيها AI (enterprise) نستخدم مسار الباقة العادي.
  // لو الباقة مفيهاش AI (free/go/pro) لكن البيتا سارية → نتحقق من عداد البيتا فقط.
  if (monthlyLimit === 0) {
    const beta = await getAgentBetaStatus(ownerId);
    if (beta.active) {
      if (beta.remaining < estimatedTokens) {
        await notifyPlanLimitReached(ownerId, "aiTokens");
        return {
          allowed: false,
          code: "LIMIT_REACHED",
          message: `انتهت توكنز تجربة Agent Beta Access (${beta.limit.toLocaleString("ar-EG")} توكن). رقِّ إلى باقة Max لمتابعة استخدام إيجنت وني.`,
          plan,
          requiredPlan: "enterprise",
          limit: beta.limit,
          used: beta.used,
        };
      }
      return { allowed: true };
    }
    return {
      allowed: false,
      code: "FEATURE_LOCKED",
      message: "ميزة AI Sales Assistant غير متاحة في باقتك الحالية.",
      plan,
      requiredPlan: "enterprise",
    };
  }

  const fullSub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      aiTokensUsedThisMonth: true,
      aiTokensBonusBalance: true,
      aiTokensBonusExpiresAt: true,
      periodResetAt: true,
    },
  });

  let usedThisMonth = fullSub?.aiTokensUsedThisMonth ?? 0;
  if (fullSub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, fullSub.periodResetAt);
    if (reset !== null) usedThisMonth = 0;
  }

  const bonusBalance = await expireBonusTokensIfNeeded(
    ownerId,
    fullSub?.aiTokensBonusBalance ?? 0,
    fullSub?.aiTokensBonusExpiresAt ?? null
  );
  if (isUnlimited(monthlyLimit)) return { allowed: true };

  const monthlyRemaining = Math.max(0, monthlyLimit - usedThisMonth);
  const totalRemaining = monthlyRemaining + bonusBalance;

  if (totalRemaining < estimatedTokens) {
    await notifyPlanLimitReached(ownerId, "aiTokens");
    return {
      allowed: false,
      code: "LIMIT_REACHED",
      message: `انتهت حصتك الشهرية من التوكن (${limitLabel(monthlyLimit)} توكن) والرصيد الإضافي.`,
      plan,
      limit: monthlyLimit,
      used: usedThisMonth,
    };
  }
  return { allowed: true };
}

export async function incrementAITokens(ownerId: string, tokens: number): Promise<void> {
  if (!ownerId || tokens <= 0) return;

  try {
    const isBypass = (await isSuperAdmin(ownerId)) || (await isBetaBypass(ownerId));

    let fullSub = await prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: {
        id: true,
        plan: true,
        aiTokensUsedThisMonth: true,
        aiTokensBonusBalance: true,
        aiTokensBonusExpiresAt: true,
        periodResetAt: true,
      },
    });

    if (!fullSub) {
      fullSub = await prisma.subscription.create({
        data: {
          userId: ownerId,
          plan: "free",
          status: "active",
          periodResetAt: new Date(),
          aiTokensUsedThisMonth: 0,
          aiTokensBonusBalance: 0,
        },
        select: {
          id: true,
          plan: true,
          aiTokensUsedThisMonth: true,
          aiTokensBonusBalance: true,
          aiTokensBonusExpiresAt: true,
          periodResetAt: true,
        },
      });
    }

    let usedThisMonth = fullSub.aiTokensUsedThisMonth ?? 0;
    if (fullSub.periodResetAt) {
      const reset = await resetMonthlyCounterIfNeeded(ownerId, fullSub.periodResetAt);
      if (reset !== null) usedThisMonth = 0;
    }

    const sub = await getSubscription(ownerId);
    const plan = getEffectivePlan(sub);
    const monthlyLimit = PLANS[plan].aiTokensPerMonth;

    // ── Agent Beta Access: الخصم من عداد البيتا المعزول فقط ──
    // لا يخصم من أي AI allowance آخر. لو رقّى لـ Max أثناء البيتا،
    // المسار العادي للباقة هو المستخدم (monthlyLimit > 0) والبيتا تُتجاهل.
    // ملحوظة: هذا مسار احتياطي (post-hoc). المسارات الساخنة (runner/nudge/preview)
    // تستخدم reserve→settle الذري قبل التوليد — هذا هنا للتوافق الخلفي فقط.
    if (monthlyLimit === 0) {
      const beta = await getAgentBetaStatus(ownerId);
      if (beta.active) {
        const ok = await consumeAgentBetaTokensAtomic(ownerId, tokens);
        console.log(`[AI-TOKENS] userId=${ownerId} tokensUsed=${tokens} agentBetaUsage~${beta.used + tokens} bypassLimit=false beta=true consumed=${ok}`);
        if (!ok) {
          // فشل الخصم الذري = نفاد متزامن — أرسل تنبيه الانتهاء مرة واحدة
          const claim = await prisma.subscription.updateMany({
            where: { userId: ownerId, agentBetaExpiredNotifiedAt: null },
            data: { agentBetaExpiredNotifiedAt: new Date() },
          });
          if (claim.count) {
            notifyAgentBetaEnded(ownerId, "tokens_exhausted").catch(() => {});
          }
        }
        return;
      }
    }

    if (isBypass || isUnlimited(monthlyLimit)) {
      // Atomic increment for bypass/unlimited users - usage is tracked without deducting bonus or enforcing limits
      await prisma.subscription.update({
        where: { userId: ownerId },
        data: { aiTokensUsedThisMonth: { increment: tokens } },
      });
      console.log(`[AI-TOKENS] userId=${ownerId} tokensUsed=${tokens} monthlyUsage=${usedThisMonth + tokens} bypassLimit=true`);
      return;
    }

    const bonusBalance = await expireBonusTokensIfNeeded(
      ownerId,
      fullSub.aiTokensBonusBalance ?? 0,
      fullSub.aiTokensBonusExpiresAt ?? null
    );

    const monthlyRemaining = Math.max(0, monthlyLimit - usedThisMonth);
    if (tokens <= monthlyRemaining) {
      await prisma.subscription.update({
        where: { userId: ownerId },
        data: { aiTokensUsedThisMonth: { increment: tokens } },
      });
    } else {
      const overflow = tokens - monthlyRemaining;
      const fromBonus = Math.min(overflow, bonusBalance);
      await prisma.subscription.update({
        where: { userId: ownerId },
        data: {
          aiTokensUsedThisMonth: { increment: tokens },
          ...(fromBonus > 0 ? { aiTokensBonusBalance: { decrement: fromBonus } } : {}),
        },
      });
    }

    console.log(`[AI-TOKENS] userId=${ownerId} tokensUsed=${tokens} monthlyUsage=${usedThisMonth + tokens} bypassLimit=false`);
  } catch (err) {
    console.error(`[AI-TOKENS] Failed to record token usage for user ${ownerId}:`, err);
  }
}

// ─── إضافة رصيد توكنز إضافي (bonus) عند شراء باقة توكنز ─────────────────────
// كل رصيد bonus له تاريخ انتهاء = 30 يوم من تاريخ إضافته (aiTokensBonusExpiresAt).
// لو اليوزر عنده رصيد قديم لسه صالح (متجاوزش الـ30 يوم بتاعته)، بنسيب تاريخ
// الانتهاء زي ما هو (منضيفش مدة إضافية للرصيد القديم) ونزود عليه الكمية الجديدة
// بس — عشان محدش يقدر يمدد صلاحية توكنز قديمة لمجرد إنه اشترى كمية صغيرة جديدة.
// لو الرصيد كان صفر أو منتهي فعلاً، بنبدأ دورة 30 يوم جديدة من دلوقتي.
export async function addAITokensBonus(ownerId: string, tokens: number): Promise<void> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const existing = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { aiTokensBonusBalance: true, aiTokensBonusExpiresAt: true },
  });

  const hasActiveBalance =
    !!existing &&
    existing.aiTokensBonusBalance > 0 &&
    !!existing.aiTokensBonusExpiresAt &&
    existing.aiTokensBonusExpiresAt > now;

  await prisma.subscription.upsert({
    where: { userId: ownerId },
    update: {
      aiTokensBonusBalance: { increment: tokens },
      // لو مفيش رصيد صالح حاليًا، ابدأ دورة 30 يوم جديدة. لو فيه رصيد صالح، سيبه
      // زي ما هو (منمدوش الصلاحية).
      ...(hasActiveBalance ? {} : { aiTokensBonusExpiresAt: thirtyDaysFromNow }),
    },
    create: {
      userId: ownerId, plan: "enterprise", status: "active",
      periodResetAt: now, campaignsUsedThisMonth: 0,
      aiTokensUsedThisMonth: 0, aiTokensBonusBalance: tokens,
      aiTokensBonusExpiresAt: thirtyDaysFromNow,
    },
  });
}