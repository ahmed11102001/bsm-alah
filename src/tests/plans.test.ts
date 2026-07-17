// src/__tests__/plans.test.ts
import { describe, it, expect } from "vitest";
import {
  planAtLeast,
  isUnlimited,
  limitLabel,
  PLANS,
  PLAN_ORDER,
  FEATURE_REQUIRED_PLAN,
  type PlanTier,
} from "@/lib/plans";

describe("planAtLeast", () => {
  it("free >= free", () => expect(planAtLeast("free", "free")).toBe(true));
  it("starter >= free", () => expect(planAtLeast("starter", "free")).toBe(true));
  it("pro >= starter", () => expect(planAtLeast("pro", "starter")).toBe(true));
  it("enterprise >= enterprise", () => expect(planAtLeast("enterprise", "enterprise")).toBe(true));

  it("free مش >= starter", () => expect(planAtLeast("free", "starter")).toBe(false));
  it("starter مش >= pro", () => expect(planAtLeast("starter", "pro")).toBe(false));
  it("pro مش >= enterprise", () => expect(planAtLeast("pro", "enterprise")).toBe(false));
});

describe("isUnlimited", () => {
  it("بيعرف -1 كـ unlimited", () => expect(isUnlimited(-1)).toBe(true));
  it("0 مش unlimited", () => expect(isUnlimited(0)).toBe(false));
  it("أي رقم موجب مش unlimited", () => expect(isUnlimited(100)).toBe(false));
});

describe("limitLabel", () => {
  it("-1 بيظهر 'غير محدود'", () => expect(limitLabel(-1)).toBe("غير محدود"));
  it("100 بيتنسق بالعربي", () => expect(limitLabel(100)).toBe("١٠٠"));
  it("20000 بيتنسق صح", () => expect(limitLabel(20_000)).toBe("٢٠٬٠٠٠"));
});

describe("PLANS — consistency checks", () => {
  const tiers: PlanTier[] = ["free", "starter", "pro", "enterprise"];

  it("كل الباقات موجودة", () => {
    tiers.forEach((t) => expect(PLANS[t]).toBeDefined());
  });

  it("حدود الـ contacts بتزيد مع كل باقة (أو -1)", () => {
    const limits = tiers.map((t) => PLANS[t].contacts);
    // كل رقم إما أكبر من السابق أو -1
    for (let i = 1; i < limits.length; i++) {
      const prev = limits[i - 1];
      const curr = limits[i];
      expect(curr === -1 || curr > prev).toBe(true);
    }
  });

  it("free مش عندها aiAgent", () => {
    expect(PLANS.free.aiAgent).toBe(false);
  });

  it("enterprise عندها كل المميزات", () => {
    const ep = PLANS.enterprise;
    expect(ep.aiAgent).toBe(true);
    expect(ep.apiAccess).toBe(true);
    expect(ep.storeIntegration).toBe(true);
    expect(ep.contacts).toBe(-1);
    expect(ep.teamMembers).toBe(-1);
    expect(ep.campaignsPerMonth).toBe(-1);
  });

  it("free مش عندها scheduledCampaigns", () => {
    expect(PLANS.free.scheduledCampaigns).toBe(false);
  });

  it("pro عندها apiAccess (وصول Claude MCP)", () => {
    expect(PLANS.pro.apiAccess).toBe(true);
  });
});

describe("PLAN_ORDER", () => {
  it("الترتيب صحيح", () => {
    expect(PLAN_ORDER).toEqual(["free", "starter", "pro", "enterprise"]);
  });

  it("طول الـ order = عدد الباقات", () => {
    expect(PLAN_ORDER.length).toBe(4);
  });
});

describe("FEATURE_REQUIRED_PLAN", () => {
  it("aiAgent بيحتاج enterprise", () => {
    expect(FEATURE_REQUIRED_PLAN.aiAgent).toBe("enterprise");
  });

  it("mediaMessages بيحتاج starter كحد أدنى", () => {
    expect(planAtLeast("starter", FEATURE_REQUIRED_PLAN.mediaMessages)).toBe(true);
    expect(planAtLeast("free", FEATURE_REQUIRED_PLAN.mediaMessages)).toBe(false);
  });

  it("storeIntegration بيحتاج pro", () => {
    expect(FEATURE_REQUIRED_PLAN.storeIntegration).toBe("pro");
  });

  it("apiAccess بيحتاج pro كحد أدنى", () => {
    expect(FEATURE_REQUIRED_PLAN.apiAccess).toBe("pro");
  });
});