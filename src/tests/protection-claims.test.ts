// src/tests/protection-claims.test.ts
import { describe, it, expect } from "vitest";
import { calculateSubscriptionRefund } from "@/lib/protection/audit-engine";
import {
  AdminCreateProtectionClaimSchema,
  AdminProtectionClaimDecisionSchema,
  parseInput,
} from "@/lib/schemas";

describe("Protection Claims & Refund Calculation", () => {
  it("calculates prorated refund accurately for Pro plan (599 EGP)", () => {
    // 30 day period: Aug 1 to Aug 31. Ban on Aug 20 (11 days remaining, 19 days used).
    const start = new Date("2026-08-01T00:00:00Z");
    const end = new Date("2026-08-31T00:00:00Z");
    const ban = new Date("2026-08-20T00:00:00Z");

    const result = calculateSubscriptionRefund(
      {
        plan: "pro",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        createdAt: start,
      },
      ban,
      "EGP"
    );

    expect(result.monthlyPrice).toBe(599);
    expect(result.totalDaysInPeriod).toBe(30);
    expect(result.remainingDays).toBe(11);
    expect(result.usedDays).toBe(19);
    // (599 / 30) * 11 = 219.63
    expect(result.calculatedRefund).toBeCloseTo(219.63, 1);
  });

  it("returns 0 refund when subscription is expired or free", () => {
    const start = new Date("2026-07-01T00:00:00Z");
    const end = new Date("2026-07-31T00:00:00Z");
    const ban = new Date("2026-08-10T00:00:00Z");

    const resultExpired = calculateSubscriptionRefund(
      {
        plan: "starter",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        createdAt: start,
      },
      ban
    );

    expect(resultExpired.remainingDays).toBe(0);
    expect(resultExpired.calculatedRefund).toBe(0);

    const resultFree = calculateSubscriptionRefund(
      {
        plan: "free",
        currentPeriodStart: start,
        currentPeriodEnd: new Date("2026-08-30T00:00:00Z"),
        createdAt: start,
      },
      new Date("2026-08-10T00:00:00Z")
    );

    expect(resultFree.calculatedRefund).toBe(0);
  });

  it("validates AdminCreateProtectionClaimSchema correctly", () => {
    const valid = parseInput(AdminCreateProtectionClaimSchema, {
      whatsappAccountId: "acc_123",
      banDetectedAt: "2026-08-15T12:00:00Z",
      customerNotes: "Number got banned after campaign",
    });
    expect(valid.ok).toBe(true);

    const invalid = parseInput(AdminCreateProtectionClaimSchema, {
      whatsappAccountId: "",
      banDetectedAt: "",
    });
    expect(invalid.ok).toBe(false);
  });

  it("enforces mandatory decisionReason when rejecting claim (NOT_ELIGIBLE)", () => {
    // Missing reason should fail validation
    const invalidRejection = parseInput(AdminProtectionClaimDecisionSchema, {
      status: "NOT_ELIGIBLE",
      decisionReason: "",
    });
    expect(invalidRejection.ok).toBe(false);

    // Valid rejection with reason
    const validRejection = parseInput(AdminProtectionClaimDecisionSchema, {
      status: "NOT_ELIGIBLE",
      decisionReason: "Policy violation: freeform outbound outside 24h window",
    });
    expect(validRejection.ok).toBe(true);

    // Approval without explicit reason is valid
    const validApproval = parseInput(AdminProtectionClaimDecisionSchema, {
      status: "ELIGIBLE",
      refundAmount: 350,
    });
    expect(validApproval.ok).toBe(true);
  });
});
