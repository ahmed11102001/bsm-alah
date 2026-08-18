// src/tests/referral-program.test.ts
import { describe, it, expect } from "vitest";
import {
  COMMISSION_BASE_RATES,
  MAX_COMMISSION_RATE,
  getReferralRate,
  getReferralRatesForAllPlans,
  computeRewardAmount,
} from "@/lib/referral/commission";

describe("Referral Program & Commission Engine", () => {
  it("uses the referred customer's plan for the base rate", () => {
    expect(COMMISSION_BASE_RATES.starter).toBe(0.10);
    expect(COMMISSION_BASE_RATES.pro).toBe(0.25);
    expect(COMMISSION_BASE_RATES.enterprise).toBe(0.35);

    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 0 }).finalRate).toBe(0.10);
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 0 }).finalRate).toBe(0.25);
    expect(getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals: 0 }).finalRate).toBe(0.35);
  });

  it("Starter progression reaches the 50% cap at 14 previous referrals", () => {
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 0 }).finalRate).toBe(0.10);
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 1 }).finalRate).toBe(0.13);
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 5 }).finalRate).toBe(0.25);
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 10 }).finalRate).toBe(0.40);
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 14 }).finalRate).toBe(0.50);
    expect(getReferralRate({ referredPlan: "starter", previousQualifiedReferrals: 20 }).finalRate).toBe(0.50);
  });

  it("Professional progression reaches the 50% cap at 9 previous referrals", () => {
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 0 }).finalRate).toBe(0.25);
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 1 }).finalRate).toBe(0.28);
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 5 }).finalRate).toBe(0.40);
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 8 }).finalRate).toBe(0.49);
    expect(getReferralRate({ referredPlan: "pro", previousQualifiedReferrals: 9 }).finalRate).toBe(0.50);
  });

  it("Enterprise progression reaches the 50% cap at 5 previous referrals", () => {
    expect(getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals: 0 }).finalRate).toBe(0.35);
    expect(getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals: 1 }).finalRate).toBe(0.38);
    expect(getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals: 5 }).finalRate).toBe(0.50);
    expect(getReferralRate({ referredPlan: "enterprise", previousQualifiedReferrals: 10 }).finalRate).toBe(0.50);
  });

  it("never exceeds the 50% maximum", () => {
    expect(MAX_COMMISSION_RATE).toBe(0.50);
    for (const referredPlan of ["starter", "pro", "enterprise"]) {
      expect(
        getReferralRate({ referredPlan, previousQualifiedReferrals: 100 }).finalRate
      ).toBe(0.50);
    }
  });

  it("returns the plan-specific rates for the UI", () => {
    const rates = getReferralRatesForAllPlans(3);

    expect(rates.starter.finalRate).toBe(0.19);
    expect(rates.pro.finalRate).toBe(0.34);
    expect(rates.enterprise.finalRate).toBe(0.44);
    expect(rates.starter.baseRate).toBe(0.10);
    expect(rates.pro.baseRate).toBe(0.25);
    expect(rates.enterprise.baseRate).toBe(0.35);
  });

  it("does not reward Free referred plans", () => {
    const result = getReferralRate({
      referredPlan: "free",
      previousQualifiedReferrals: 10,
    });

    expect(result.eligible).toBe(false);
    expect(result.finalRate).toBe(0);
  });

  it("computes reward amount accurately with decimal rounding", () => {
    const calc1 = computeRewardAmount(599, 0.25);
    expect(calc1.rate).toBe(0.25);
    expect(calc1.baseAmount).toBe(599);
    expect(calc1.rewardAmount).toBe(149.75);

    const calc2 = computeRewardAmount(249, 0.10);
    expect(calc2.rewardAmount).toBe(24.9);

    expect(computeRewardAmount(0, 0.10).rewardAmount).toBe(0);
    expect(computeRewardAmount(-100, 0.10).rewardAmount).toBe(0);
    expect(computeRewardAmount(100, 0.99).rate).toBe(0.50);
  });
});
