// src/lib/referral/types.ts
// ══════════════════════════════════════════════════════════════════════════════
//  أنواع نظام الإحالات والعمولات (Referral & Affiliate Program)
// ══════════════════════════════════════════════════════════════════════════════

import type { PlanTier } from "@/lib/plans";

export type { AffiliateStatus, ReferralStatus, RewardStatus, ReferralLedgerType } from "@prisma/client";

export interface ReferralRateView {
  baseRate: number;
  bonusRate: number;
  finalRate: number;
}

export interface ReferralRatesByPlan {
  starter: ReferralRateView;
  pro: ReferralRateView;
  enterprise: ReferralRateView;
}

export interface ReferralStatusResponse {
  isEligible: boolean;
  code: string | null;
  referralLink: string | null;
  qualifiedCount: number;
  pendingCount: number;

  // currentRate is the maximum current rate across paid referred plans.
  // The exact rate is plan-specific, so consumers should use ratesByPlan.
  currentRate: number;
  minCurrentRate: number;
  maxCurrentRate: number;
  bonusRate: number;
  ratesByPlan: ReferralRatesByPlan;

  creditBalance: number;
  totalEarned: number;
}

export interface ReferralHistoryItem {
  id: string;
  referredName: string;
  status: "PENDING" | "QUALIFIED" | "REVERSED" | "EXPIRED";
  signedUpAt: string;
  qualifiedAt: string | null;
  reward: {
    baseRate: number;
    appliedRate: number;
    baseAmount: number;
    rewardAmount: number;
    status: "PENDING" | "APPROVED" | "REVERSED";
  } | null;
}
