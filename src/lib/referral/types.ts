// src/lib/referral/types.ts
// ══════════════════════════════════════════════════════════════════════════════
//  أنواع نظام الإحالات والعمولات (Referral & Affiliate Program)
// ══════════════════════════════════════════════════════════════════════════════

import type { PlanTier } from "@/lib/plans";

export type { AffiliateStatus, ReferralStatus, RewardStatus, ReferralLedgerType } from "@prisma/client";

export interface TierRate {
  tierLevel: number;
  minQualified: number;
  maxQualified: number; // inclusive or Infinity
  rate: number; // e.g. 0.05 = 5%
  labelAr: string;
  labelEn: string;
}

export interface CommissionTierInfo {
  eligible: boolean;
  ownerPlan: PlanTier;
  qualifiedCount: number;
  currentRate: number; // e.g. 0.10
  currentTierLevel: number;
  currentTierLabel: string;
  nextTier: {
    tierLevel: number;
    rate: number;
    minQualified: number;
    labelAr: string;
  } | null;
  referralsNeededForNextTier: number;
  progressPercent: number; // 0 to 100 towards next tier
}

export interface ReferralStatusResponse {
  isEligible: boolean;
  code: string | null;
  referralLink: string | null;
  qualifiedCount: number;
  pendingCount: number;
  currentRate: number;
  currentTier: string;
  creditBalance: number;
  nextTier: {
    tierLevel: number;
    rate: number;
    minQualified: number;
    label: string;
  } | null;
  referralsNeededForNextTier: number;
  progressPercent: number;
  totalEarned: number;
}

export interface ReferralHistoryItem {
  id: string;
  referredName: string;
  status: "PENDING" | "QUALIFIED" | "REVERSED" | "EXPIRED";
  signedUpAt: string;
  qualifiedAt: string | null;
  reward: {
    rate: number;
    baseAmount: number;
    rewardAmount: number;
    status: "PENDING" | "APPROVED" | "REVERSED";
  } | null;
}
