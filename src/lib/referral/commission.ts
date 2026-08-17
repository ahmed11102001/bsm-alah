// src/lib/referral/commission.ts
// ══════════════════════════════════════════════════════════════════════════════
//  نظام العمولة المتدرج لبرنامج الإحالات
//  مرجع العمولات الوحيد في التطبيق — عدّل هنا فقط
// ══════════════════════════════════════════════════════════════════════════════

import type { PlanTier } from "@/lib/plans";
import type { TierRate, CommissionTierInfo } from "./types";

export const COMMISSION_TIERS: Record<"starter" | "pro" | "enterprise", TierRate[]> = {
  starter: [
    { tierLevel: 1, minQualified: 1, maxQualified: 2, rate: 0.05, labelAr: "المستوى الأول (5%)", labelEn: "Tier 1 (5%)" },
    { tierLevel: 2, minQualified: 3, maxQualified: 5, rate: 0.07, labelAr: "المستوى الثاني (7%)", labelEn: "Tier 2 (7%)" },
    { tierLevel: 3, minQualified: 6, maxQualified: 10, rate: 0.10, labelAr: "المستوى الثالث (10%)", labelEn: "Tier 3 (10%)" },
    { tierLevel: 4, minQualified: 11, maxQualified: Infinity, rate: 0.15, labelAr: "المستوى المتميز (15%)", labelEn: "Elite Tier (15%)" },
  ],
  pro: [
    { tierLevel: 1, minQualified: 1, maxQualified: 2, rate: 0.07, labelAr: "المستوى الأول (7%)", labelEn: "Tier 1 (7%)" },
    { tierLevel: 2, minQualified: 3, maxQualified: 5, rate: 0.10, labelAr: "المستوى الثاني (10%)", labelEn: "Tier 2 (10%)" },
    { tierLevel: 3, minQualified: 6, maxQualified: 10, rate: 0.15, labelAr: "المستوى الثالث (15%)", labelEn: "Tier 3 (15%)" },
    { tierLevel: 4, minQualified: 11, maxQualified: Infinity, rate: 0.20, labelAr: "المستوى المتميز (20%)", labelEn: "Elite Tier (20%)" },
  ],
  enterprise: [
    { tierLevel: 1, minQualified: 1, maxQualified: 2, rate: 0.10, labelAr: "المستوى الأول (10%)", labelEn: "Tier 1 (10%)" },
    { tierLevel: 2, minQualified: 3, maxQualified: 5, rate: 0.15, labelAr: "المستوى الثاني (15%)", labelEn: "Tier 2 (15%)" },
    { tierLevel: 3, minQualified: 6, maxQualified: 10, rate: 0.20, labelAr: "المستوى الثالث (20%)", labelEn: "Tier 3 (20%)" },
    { tierLevel: 4, minQualified: 11, maxQualified: Infinity, rate: 0.25, labelAr: "المستوى المتميز (25%)", labelEn: "Elite Tier (25%)" },
  ],
};

/**
 * دالة مركزية لحساب النسبة والمستوى الحالي والقادم بناءً على باقة المالك وعدد الإحالات المؤهلة.
 */
export function calculateCommissionTier(
  plan: PlanTier | string,
  qualifiedCount: number
): CommissionTierInfo {
  const cleanPlan = (plan ?? "free").toLowerCase() as PlanTier;

  if (cleanPlan === "free" || !(cleanPlan in COMMISSION_TIERS)) {
    return {
      eligible: false,
      ownerPlan: cleanPlan,
      qualifiedCount,
      currentRate: 0,
      currentTierLevel: 0,
      currentTierLabel: "غير مؤهل",
      nextTier: null,
      referralsNeededForNextTier: 0,
      progressPercent: 0,
    };
  }

  const tiers = COMMISSION_TIERS[cleanPlan as "starter" | "pro" | "enterprise"];
  
  // إذا لم يكن لديه إحالات بعد (0)، يبدأ من أدنى مستوى للباقة
  const currentTier = qualifiedCount <= 0
    ? tiers[0]
    : tiers.find(t => qualifiedCount >= t.minQualified && qualifiedCount <= t.maxQualified) || tiers[tiers.length - 1];

  const currentTierIndex = tiers.findIndex(t => t.tierLevel === currentTier.tierLevel);
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

  let referralsNeededForNextTier = 0;
  let progressPercent = 100;

  if (nextTier) {
    referralsNeededForNextTier = Math.max(0, nextTier.minQualified - qualifiedCount);
    const rangeStart = currentTier.minQualified > 1 ? currentTier.minQualified : 0;
    const rangeTotal = nextTier.minQualified - rangeStart;
    const currentProgress = qualifiedCount - rangeStart;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / rangeTotal) * 100)));
  }

  return {
    eligible: true,
    ownerPlan: cleanPlan,
    qualifiedCount,
    currentRate: currentTier.rate,
    currentTierLevel: currentTier.tierLevel,
    currentTierLabel: currentTier.labelAr,
    nextTier: nextTier ? {
      tierLevel: nextTier.tierLevel,
      rate: nextTier.rate,
      minQualified: nextTier.minQualified,
      labelAr: nextTier.labelAr,
    } : null,
    referralsNeededForNextTier,
    progressPercent,
  };
}

/**
 * حساب قيمة المكافأة للتحويل الجديد
 */
export function computeRewardAmount(
  baseAmount: number,
  rate: number
): { rate: number; baseAmount: number; rewardAmount: number } {
  const validBase = Math.max(0, baseAmount);
  const validRate = Math.max(0, rate);
  const rewardAmount = Math.round(validBase * validRate * 100) / 100;

  return {
    rate: validRate,
    baseAmount: validBase,
    rewardAmount,
  };
}
