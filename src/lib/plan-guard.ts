// src/lib/plan-guard.ts
// ─── Guard مركزي للتحقق من حدود الباقة قبل أي عملية ─────────────────────────
// كل API route يستدعي الدوال من هنا — مفيش منطق حدود مكرر في أي مكان.

import prisma from "@/lib/prisma";
import {
  PLANS, PLAN_NAMES, FEATURE_REQUIRED_PLAN, planAtLeast,
  isUnlimited, limitLabel,
  type PlanTier,
} from "@/lib/plans";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GuardResult =
  | { allowed: true }
  | {
      allowed: false;
      code:    "LIMIT_REACHED" | "FEATURE_LOCKED" | "NO_SUBSCRIPTION";
      message: string;          // رسالة للعرض في الـ UI
      plan:    PlanTier;        // الباقة الحالية
      requiredPlan?: PlanTier;  // الباقة اللي محتاج ترقية ليها
      limit?:  number;          // الحد الأقصى
      used?:   number;          // الاستهلاك الحالي
    };

// ─── Helper: جلب اشتراك المالك ───────────────────────────────────────────────
// ownerId = parentId لو sub-account, وإلا userId نفسه
async function getSubscription(ownerId: string) {
  return prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      plan:                  true,
      status:                true,
      campaignsUsedThisMonth: true,
      periodResetAt:          true,
    },
  });
}

/** لو مفيش subscription نرجع free كـ fallback */
function safePlan(sub: { plan: string } | null): PlanTier {
  if (!sub) return "free";
  return sub.plan as PlanTier;
}

// ─── Helper: تصفير العداد الشهري لو بدأ شهر جديد ──────────────────────────
async function resetMonthlyCounterIfNeeded(ownerId: string, periodResetAt: Date) {
  const now = new Date();
  const resetDate = new Date(periodResetAt);

  // لو الشهر اختلف → صفّر العداد
  if (
    now.getFullYear() !== resetDate.getFullYear() ||
    now.getMonth()    !== resetDate.getMonth()
  ) {
    await prisma.subscription.update({
      where: { userId: ownerId },
      data: {
        campaignsUsedThisMonth: 0,
        periodResetAt:          now,
      },
    });
    return 0;
  }
  return null; // لم يتم التصفير
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. checkContactsLimit — قبل إضافة جهة اتصال أو جمهور
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkContactsLimit(
  ownerId: string,
  addingCount = 1
): Promise<GuardResult> {
  const sub  = await getSubscription(ownerId);
  const plan = safePlan(sub);
  const limit = PLANS[plan].contacts;

  if (isUnlimited(limit)) return { allowed: true };

  const currentCount = await prisma.contact.count({
    where: { userId: ownerId, deletedAt: null },
  });

  if (currentCount + addingCount > limit) {
    return {
      allowed:      false,
      code:         "LIMIT_REACHED",
      message:      `وصلت للحد الأقصى (${limitLabel(limit)} جهة اتصال) في باقة ${PLAN_NAMES[plan]}. قم بالترقية لإضافة المزيد.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used:         currentCount,
    };
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. checkCampaignsLimit — قبل إنشاء حملة
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkCampaignsLimit(ownerId: string): Promise<GuardResult> {
  const sub  = await getSubscription(ownerId);
  const plan = safePlan(sub);
  const limit = PLANS[plan].campaignsPerMonth;

  if (isUnlimited(limit)) return { allowed: true };

  // تصفير العداد لو بدأ شهر جديد
  let used = sub?.campaignsUsedThisMonth ?? 0;
  if (sub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, sub.periodResetAt);
    if (reset !== null) used = 0;
  }

  if (used >= limit) {
    return {
      allowed:      false,
      code:         "LIMIT_REACHED",
      message:      `استهلكت كل الحملات المتاحة هذا الشهر (${limitLabel(limit)} حملة) في باقة ${PLAN_NAMES[plan]}. الحد يُجدَّد أول كل شهر أو قم بالترقية.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used,
    };
  }

  return { allowed: true };
}

/** زيادة عداد الحملات بعد الإنشاء الناجح */
export async function incrementCampaignUsage(ownerId: string): Promise<void> {
  const sub = await getSubscription(ownerId);
  if (!sub) return;
  const plan = safePlan(sub);
  if (isUnlimited(PLANS[plan].campaignsPerMonth)) return; // غير محدود → مش محتاجين نعد

  await prisma.subscription.update({
    where: { userId: ownerId },
    data:  { campaignsUsedThisMonth: { increment: 1 } },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. checkTeamLimit — قبل إضافة عضو فريق
// ═══════════════════════════════════════════════════════════════════════════════
export async function checkTeamLimit(ownerId: string): Promise<GuardResult> {
  const sub  = await getSubscription(ownerId);
  const plan = safePlan(sub);
  const limit = PLANS[plan].teamMembers;

  if (isUnlimited(limit)) return { allowed: true };

  const currentMembers = await prisma.user.count({
    where: { parentId: ownerId },
  });

  // الـ limit يشمل المالك نفسه — لذلك نقارن بـ (limit - 1)
  const membersLimit = limit - 1;

  if (currentMembers >= membersLimit) {
    return {
      allowed:      false,
      code:         "LIMIT_REACHED",
      message:      `باقة ${PLAN_NAMES[plan]} تسمح بـ ${limitLabel(limit)} مستخدمين فقط (بما فيهم أنت). قم بالترقية لإضافة المزيد.`,
      plan,
      requiredPlan: nextPlan(plan),
      limit,
      used:         currentMembers + 1, // +1 للمالك
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
  advancedReports:    "التقارير المتقدمة",
  apiAccess:          "الوصول عبر API",
  mediaMessages:      "إرسال الوسائط (صور / ملفات / صوت)",
  customAudiences:    "الجمهور المخصص",
};

export async function checkFeature(
  ownerId: string,
  feature: BooleanFeature
): Promise<GuardResult> {
  const sub  = await getSubscription(ownerId);
  const plan = safePlan(sub);

  if (PLANS[plan][feature]) return { allowed: true };

  const required = FEATURE_REQUIRED_PLAN[feature];

  return {
    allowed:      false,
    code:         "FEATURE_LOCKED",
    message:      `ميزة "${FEATURE_LABELS[feature]}" متاحة في باقة ${PLAN_NAMES[required]} وما فوقها. باقتك الحالية هي ${PLAN_NAMES[plan]}.`,
    plan,
    requiredPlan: required,
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
  const plan = safePlan(sub);
  const limits = PLANS[plan];

  // تصفير العداد لو لزم
  let campaignsUsed = sub?.campaignsUsedThisMonth ?? 0;
  if (sub?.periodResetAt) {
    const reset = await resetMonthlyCounterIfNeeded(ownerId, sub.periodResetAt);
    if (reset !== null) campaignsUsed = 0;
  }

  const [contactsCount, teamCount] = await Promise.all([
    prisma.contact.count({ where: { userId: ownerId, deletedAt: null } }),
    prisma.user.count({ where: { parentId: ownerId } }),
  ]);

  return {
    plan,
    planName:      PLAN_NAMES[plan],
    status:        sub?.status ?? "active",
    limits,
    usage: {
      contacts:           contactsCount,
      teamMembers:        teamCount + 1, // +1 للمالك
      campaignsThisMonth: campaignsUsed,
    },
  };
}

// ─── Shorthand: تحويل GuardResult لـ NextResponse مباشرة ────────────────────
import { NextResponse } from "next/server";

export function guardResponse(result: GuardResult): NextResponse | null {
  if (result.allowed) return null; // مفيش مشكلة — كمّل
  return NextResponse.json(
    {
      error:        result.message,
      code:         result.code,
      plan:         result.plan,
      requiredPlan: result.requiredPlan,
      limit:        result.limit,
      used:         result.used,
    },
    { status: 403 }
  );
}