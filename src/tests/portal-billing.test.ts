import { describe, it, expect } from "vitest";
import {
  decideSource,
  isValidTopupAmount,
  messagesFromBalance,
  OTP_PRICE_EGP,
  MAX_DEBT_EGP,
} from "@/lib/portal-billing";

function state(over: any = {}) {
  return {
    id: "p1",
    ownerId: null,
    trialCreditsTotal: 30,
    trialCreditsUsed: 0,
    trialStartedAt: new Date(),
    trialEndsAt: new Date(Date.now() + 30 * 86400_000),
    monthlyFreeTotal: 30,
    monthlyFreeUsed: 0,
    monthlyPeriodStart: null,
    monthlyPeriodEnd: null,
    paidBalanceEGP: 0,
    createdAt: new Date(),
    ...over,
  };
}

describe("portal-billing engine", () => {
  it("trial أولًا", () => {
    expect(decideSource(state())).toEqual({ allowed: true, source: "trial_credit" });
  });

  it("بعد Trial: monthly للـ owner قبل المحفظة", () => {
    const d = decideSource(
      state({
        trialCreditsUsed: 30,
        ownerId: "o1",
        monthlyPeriodStart: new Date(),
        monthlyPeriodEnd: new Date(Date.now() + 86400_000),
        paidBalanceEGP: 100,
      })
    );
    expect(d).toEqual({ allowed: true, source: "monthly_free" });
  });

  it("بعد نفاد المجاني: wallet", () => {
    const d = decideSource(state({ trialCreditsUsed: 30, paidBalanceEGP: 5 }));
    expect(d).toEqual({ allowed: true, source: "paid_wallet" });
  });

  it("رصيد 0 → debt مسموح", () => {
    const d = decideSource(state({ trialCreditsUsed: 30, paidBalanceEGP: 0 }));
    expect(d).toEqual({ allowed: true, source: "debt" });
  });

  it("مديونية -10 بالظبط → رفض صارم", () => {
    const d = decideSource(state({ trialCreditsUsed: 30, paidBalanceEGP: -MAX_DEBT_EGP }));
    expect(d.allowed).toBe(false);
    expect(d.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("-9.5 → رفض (0.75 ستتجاوز الحد)", () => {
    expect(decideSource(state({ trialCreditsUsed: 30, paidBalanceEGP: -9.5 })).allowed).toBe(false);
  });

  it("-9.25 → سماح (الناتج -10 بالظبط على الحد)", () => {
    expect(decideSource(state({ trialCreditsUsed: 30, paidBalanceEGP: -9.25 }))).toEqual({
      allowed: true,
      source: "debt",
    });
  });

  it("trial منتهي بالتاريخ يسقط للـ wallet", () => {
    const d = decideSource(
      state({ trialEndsAt: new Date(Date.now() - 1000), paidBalanceEGP: 3 })
    );
    expect(d).toEqual({ allowed: true, source: "paid_wallet" });
  });

  it("topup validation: 20 على الأقل وبمضاعفات 5 فقط", () => {
    expect(isValidTopupAmount(20)).toBe(true);
    expect(isValidTopupAmount(25)).toBe(true);
    expect(isValidTopupAmount(30)).toBe(true);
    expect(isValidTopupAmount(200)).toBe(true);
    expect(isValidTopupAmount(5000)).toBe(true);
    expect(isValidTopupAmount(19)).toBe(false);
    expect(isValidTopupAmount(21)).toBe(false);
    expect(isValidTopupAmount(39)).toBe(false);
    expect(isValidTopupAmount(50.5)).toBe(false);
    expect(isValidTopupAmount("50" as any)).toBe(false);
    expect(isValidTopupAmount(NaN)).toBe(false);
  });

  it("messagesFromBalance", () => {
    expect(messagesFromBalance(20)).toBe(Math.floor(20 / OTP_PRICE_EGP));
    expect(messagesFromBalance(0)).toBe(0);
    expect(messagesFromBalance(-5)).toBe(0);
  });
});
