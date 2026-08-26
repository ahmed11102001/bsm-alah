// src/lib/plan-guard.ts
// ─── Guard مركزي للتحقق من حدود الباقة قبل أي عملية ─────────────────────────
// كل API route يستدعي الدوال من هنا — مفيش منطق حدود مكرر في أي مكان.

import prisma from "@/lib/prisma";
import {
  PLANS, PLAN_NAMES, FEATURE_REQUIRED_PLAN, planAtLeast,
  isUnlimited, limitLabel,
  type PlanTier,
} from "@/lib/plans";
import { notifyPlanLimitReached } from "@/lib/notifications";

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
    message: `ميزة WANI Partner متاحة في باقة Enterprise فقط. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
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
    message: `ميزة Claude AI متاحة في باقة Professional وما فوقها. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
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
      message: `استهلكت كل أوامر Claude المتاحة هذا الشهر (${limit} أمر). قم بالترقية للـ Enterprise للحصول على أوامر غير محدودة.`,
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

  if (monthlyLimit === 0)
    return {
      allowed: false,
      code: "FEATURE_LOCKED",
      message: "ميزة AI Sales Assistant غير متاحة في باقتك الحالية.",
      plan,
      requiredPlan: "enterprise",
    };

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