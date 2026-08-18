// src/lib/referral/commission.ts
// ══════════════════════════════════════════════════════════════════════════════
//  Referral commission engine
//  The referred customer's paid plan determines the base rate.
//  The affiliate's previous qualified referrals determine the +3% bonus.
// ══════════════════════════════════════════════════════════════════════════════

import type { PlanTier } from "@/lib/plans";

export const MAX_COMMISSION_RATE = 0.5;
export const REFERRAL_BONUS_STEP = 0.03;

export const COMMISSION_BASE_RATES: Record<Exclude<PlanTier, "free">, number> = {
  starter: 0.10,
  pro: 0.25,
  enterprise: 0.35,
};

export interface ReferralRateResult {
  eligible: boolean;
  referredPlan: PlanTier;
  previousQualifiedReferrals: number;
  baseRate: number;
  bonusRate: number;
  finalRate: number;
}

export interface RewardCalculation {
  rate: number;
  baseAmount: number;
  rewardAmount: number;
}

/**
 * Calculates the rate for the NEXT qualified referral.
 *
 * Important: referredPlan is the NEW customer's plan, never the affiliate
 * owner's plan. previousQualifiedReferrals excludes the conversion currently
 * being processed.
 */
export function getReferralRate({
  referredPlan,
  previousQualifiedReferrals,
}: {
  referredPlan: PlanTier | string;
  previousQualifiedReferrals: number;
}): ReferralRateResult {
  const cleanPlan = (referredPlan ?? "free").toLowerCase() as PlanTier;
  const count = Math.max(0, Math.floor(previousQualifiedReferrals || 0));

  if (cleanPlan === "free" || !(cleanPlan in COMMISSION_BASE_RATES)) {
    return {
      eligible: false,
      referredPlan: cleanPlan,
      previousQualifiedReferrals: count,
      baseRate: 0,
      bonusRate: 0,
      finalRate: 0,
    };
  }

  const baseRate = COMMISSION_BASE_RATES[cleanPlan as Exclude<PlanTier, "free">];
  const bonusRate = Math.min(count * REFERRAL_BONUS_STEP, MAX_COMMISSION_RATE - baseRate);
  const finalRate = Math.min(baseRate + bonusRate, MAX_COMMISSION_RATE);

  return {
    eligible: true,
    referredPlan: cleanPlan,
    previousQualifiedReferrals: count,
    baseRate,
    bonusRate,
    finalRate,
  };
}

/**
 * Returns the current rate for every paid plan so the UI can explain that
 * the customer's selected plan determines the base rate.
 */
export function getReferralRatesForAllPlans(previousQualifiedReferrals: number) {
  return {
    starter: getReferralRate({ referredPlan: "starter", previousQualifiedReferrals }),
    pro: getReferralRate({ referredPlan: "pro", previousQualifiedReferrals }),
    enterprise: getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals }),
  };
}

/**
 * Server-side reward calculation with safe rounding.
 */
export function computeRewardAmount(
  baseAmount: number,
  rate: number
): RewardCalculation {
  const validBase = Math.max(0, baseAmount);
  const validRate = Math.min(MAX_COMMISSION_RATE, Math.max(0, rate));
  const rewardAmount = Math.round(validBase * validRate * 100) / 100;

  return {
    rate: validRate,
    baseAmount: validBase,
    rewardAmount,
  };
}
