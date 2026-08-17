// src/tests/referral-program.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCommissionTier,
  computeRewardAmount,
  COMMISSION_TIERS,
} from "@/lib/referral/commission";

describe("Referral Program & Commission Engine", () => {
  // ─── Test 1: Commission Tier Rates & Progress for Starter ─────────────────
  it("Starter plan: calculates tiered commission correctly", () => {
    // 0 qualified (initial tier)
    const tier0 = calculateCommissionTier("starter", 0);
    expect(tier0.eligible).toBe(true);
    expect(tier0.currentRate).toBe(0.05); // 5%
    expect(tier0.referralsNeededForNextTier).toBe(3); // Next tier starts at 3

    // 1-2 qualified (5%)
    const tier1 = calculateCommissionTier("starter", 1);
    expect(tier1.currentRate).toBe(0.05);
    expect(tier1.referralsNeededForNextTier).toBe(2);

    const tier2 = calculateCommissionTier("starter", 2);
    expect(tier2.currentRate).toBe(0.05);
    expect(tier2.referralsNeededForNextTier).toBe(1);

    // 3-5 qualified (7%)
    const tier3 = calculateCommissionTier("starter", 3);
    expect(tier3.currentRate).toBe(0.07);
    expect(tier3.referralsNeededForNextTier).toBe(3); // Next tier starts at 6

    // 6-10 qualified (10%)
    const tier6 = calculateCommissionTier("starter", 6);
    expect(tier6.currentRate).toBe(0.10);
    expect(tier6.referralsNeededForNextTier).toBe(5); // Next tier starts at 11

    // 11+ qualified (15% - Elite)
    const tier11 = calculateCommissionTier("starter", 11);
    expect(tier11.currentRate).toBe(0.15);
    expect(tier11.nextTier).toBeNull();
    expect(tier11.referralsNeededForNextTier).toBe(0);
    expect(tier11.progressPercent).toBe(100);
  });

  // ─── Test 2: Commission Tier Rates for Professional ───────────────────────
  it("Professional plan: calculates tiered commission correctly (7% to 20%)", () => {
    expect(calculateCommissionTier("pro", 1).currentRate).toBe(0.07);
    expect(calculateCommissionTier("pro", 2).currentRate).toBe(0.07);
    expect(calculateCommissionTier("pro", 3).currentRate).toBe(0.10);
    expect(calculateCommissionTier("pro", 5).currentRate).toBe(0.10);
    expect(calculateCommissionTier("pro", 6).currentRate).toBe(0.15);
    expect(calculateCommissionTier("pro", 10).currentRate).toBe(0.15);
    expect(calculateCommissionTier("pro", 11).currentRate).toBe(0.20);
    expect(calculateCommissionTier("pro", 25).currentRate).toBe(0.20);
  });

  // ─── Test 3: Commission Tier Rates for Enterprise ─────────────────────────
  it("Enterprise plan: calculates tiered commission correctly (10% to 25%)", () => {
    expect(calculateCommissionTier("enterprise", 1).currentRate).toBe(0.10);
    expect(calculateCommissionTier("enterprise", 3).currentRate).toBe(0.15);
    expect(calculateCommissionTier("enterprise", 7).currentRate).toBe(0.20);
    expect(calculateCommissionTier("enterprise", 12).currentRate).toBe(0.25);
  });

  // ─── Test 4: Free Plan is Not Eligible ─────────────────────────────────────
  it("Free plan: is marked as not eligible (0% rate)", () => {
    const freeTier = calculateCommissionTier("free", 5);
    expect(freeTier.eligible).toBe(false);
    expect(freeTier.currentRate).toBe(0);
    expect(freeTier.nextTier).toBeNull();
  });

  // ─── Test 5: Reward Calculation Precision ─────────────────────────────────
  it("computes reward amount accurately with decimal rounding", () => {
    // Professional owner: 7 qualified referrals (Rate = 15%), customer paid 599 EGP
    const calc1 = computeRewardAmount(599, 0.15);
    expect(calc1.rate).toBe(0.15);
    expect(calc1.baseAmount).toBe(599);
    expect(calc1.rewardAmount).toBe(89.85); // 599 * 0.15 = 89.85

    // Starter owner: 1 qualified referral (Rate = 5%), customer paid 249 EGP
    const calc2 = computeRewardAmount(249, 0.05);
    expect(calc2.rewardAmount).toBe(12.45); // 249 * 0.05 = 12.45

    // Edge case: 0 base amount or negative
    expect(computeRewardAmount(0, 0.10).rewardAmount).toBe(0);
    expect(computeRewardAmount(-100, 0.10).rewardAmount).toBe(0);
  });

  // ─── Test 6: Tier Progress Calculation ────────────────────────────────────
  it("calculates progress percentage towards next tier correctly", () => {
    // Starter: tier 1 is 1-2, next is 3. At 1 referral: range (0 to 3), 1/3 = 33%
    const p1 = calculateCommissionTier("starter", 1);
    expect(p1.progressPercent).toBe(33);

    // Starter: at 2 referrals: 2/3 = 67%
    const p2 = calculateCommissionTier("starter", 2);
    expect(p2.progressPercent).toBe(67);

    // Pro: at 10 referrals (tier 3: 6-10, next tier: 11): 10 - 6 = 4, range = 11 - 6 = 5, 4/5 = 80%
    const p10 = calculateCommissionTier("pro", 10);
    expect(p10.progressPercent).toBe(80);
  });
});
