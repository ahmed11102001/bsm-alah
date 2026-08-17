// src/tests/referral-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  generateUniqueReferralCode,
  getOrCreateAffiliateForUser,
  getAffiliateStatus,
  trackReferralSignup,
  processConversionReward,
  reverseConversionReward,
  getAvailableReferralCredit,
  applyReferralCreditToInvoice,
} from "@/lib/referral/service";
import { Prisma } from "@prisma/client";

// Mock prisma for isolated service testing
vi.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    affiliate: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    referral: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    referralReward: {
      findUnique: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    referralLedgerEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return await cb(mockPrisma);
      }
      return cb;
    }),
  };
  return { default: mockPrisma };
});

describe("Referral Service Lifecycle & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test 1: Code Generation ──────────────────────────────────────────────
  it("generates a clean uppercase alphanumeric referral code", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue(null);

    const code = await generateUniqueReferralCode("Ahmed Ali");
    expect(code).toMatch(/^AHMED\d{3}$/);
  });

  // ─── Test 2: Free user is not eligible for Affiliate record in UI ─────────
  it("Free user: getOrCreateAffiliateForUser returns not eligible", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "free-user-1",
      name: "Free User",
      email: "free@example.com",
      subscription: {
        plan: "free",
        status: "active",
        currentPeriodEnd: null,
      },
      affiliate: null,
    } as any);

    const result = await getOrCreateAffiliateForUser("free-user-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("NOT_PAID_PLAN");
  });

  // ─── Test 3: Paid user gets an Affiliate record created on-demand ─────────
  it("Paid user: creates an affiliate record upon first request", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "paid-user-1",
      name: "Pro User",
      email: "pro@example.com",
      subscription: {
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
      affiliate: null,
    } as any);

    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.affiliate.create).mockResolvedValue({
      id: "aff-1",
      userId: "paid-user-1",
      code: "PRO123",
      name: "Pro User",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getOrCreateAffiliateForUser("paid-user-1");
    expect(result.eligible).toBe(true);
    expect(result.affiliate?.code).toBe("PRO123");
    expect(prisma.affiliate.create).toHaveBeenCalled();
  });

  // ─── Test 4: Signup Attribution (First-Touch & Self-Referral Prevention) ──
  it("trackReferralSignup: prevents self-referral", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({
      id: "aff-1",
      userId: "user-1",
      status: "ACTIVE",
    } as any);

    const result = await trackReferralSignup({
      referredUserId: "user-1", // Same user
      refCode: "PRO123",
    });

    expect(result).toBeNull();
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  it("trackReferralSignup: creates PENDING referral for valid new signup", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({
      id: "aff-1",
      userId: "owner-1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.referral.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.referral.create).mockResolvedValue({
      id: "ref-1",
      affiliateId: "aff-1",
      referredUserId: "new-customer-1",
      status: "PENDING",
    } as any);

    const result = await trackReferralSignup({
      referredUserId: "new-customer-1",
      refCode: "PRO123",
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe("PENDING");
  });

  it("trackReferralSignup: preserves first-touch attribution if user already has a referral", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({
      id: "aff-2",
      userId: "owner-2",
      status: "ACTIVE",
    } as any);
    // Already linked to aff-1
    vi.mocked(prisma.referral.findUnique).mockResolvedValue({
      id: "ref-1",
      affiliateId: "aff-1",
      referredUserId: "existing-referred-user",
      status: "PENDING",
    } as any);

    const result = await trackReferralSignup({
      referredUserId: "existing-referred-user",
      refCode: "OTHERCODE",
    });

    expect(result?.affiliateId).toBe("aff-1"); // Kept original
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  // ─── Test 5: Conversion Reward & Idempotency ──────────────────────────────
  it("processConversionReward: converts PENDING referral to QUALIFIED and awards credit", async () => {
    vi.mocked(prisma.referral.findUnique).mockResolvedValue({
      id: "ref-1",
      affiliateId: "aff-1",
      referredUserId: "customer-1",
      status: "PENDING",
      affiliate: {
        id: "aff-1",
        code: "PRO123",
        userId: "owner-1",
        user: {
          subscription: {
            plan: "pro",
            status: "active",
          },
        },
      },
    } as any);

    vi.mocked(prisma.referralReward.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.referral.count).mockResolvedValue(0); // First conversion -> rate = 7%
    vi.mocked(prisma.referralLedgerEntry.findFirst).mockResolvedValue(null); // balance 0
    vi.mocked(prisma.referral.update).mockResolvedValue({} as any);
    vi.mocked(prisma.referralReward.create).mockResolvedValue({
      id: "reward-1",
      rewardAmount: new Prisma.Decimal(41.93), // 599 * 0.07 = 41.93
    } as any);

    const reward = await processConversionReward({
      referredUserId: "customer-1",
      paymentInvoiceId: "inv-1001",
      amountPaid: 599,
    });

    expect(reward).not.toBeNull();
    expect(prisma.referral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref-1" },
        data: expect.objectContaining({ status: "QUALIFIED" }),
      })
    );
    expect(prisma.referralLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "EARNED",
          balanceAfter: new Prisma.Decimal(41.93),
        }),
      })
    );
  });

  it("processConversionReward: ignores duplicate payment webhook (idempotency)", async () => {
    vi.mocked(prisma.referral.findUnique).mockResolvedValue({
      id: "ref-1",
      status: "PENDING",
      affiliate: {
        user: { subscription: { plan: "pro", status: "active" } },
      },
    } as any);

    // Existing reward with same paymentInvoiceId
    vi.mocked(prisma.referralReward.findUnique).mockResolvedValue({
      id: "existing-reward-1",
      paymentInvoiceId: "inv-1001",
      rewardAmount: new Prisma.Decimal(41.93),
    } as any);

    const reward = await processConversionReward({
      referredUserId: "customer-1",
      paymentInvoiceId: "inv-1001",
      amountPaid: 599,
    });

    expect(reward).toEqual(expect.objectContaining({ id: "existing-reward-1" }));
    expect(prisma.referralReward.create).not.toHaveBeenCalled();
  });

  // ─── Test 6: Reversal on Refund ───────────────────────────────────────────
  it("reverseConversionReward: marks reward REVERSED and logs negative ledger entry", async () => {
    vi.mocked(prisma.referralReward.findUnique).mockResolvedValue({
      id: "reward-1",
      affiliateId: "aff-1",
      referralId: "ref-1",
      rewardAmount: new Prisma.Decimal(41.93),
      status: "APPROVED",
    } as any);

    vi.mocked(prisma.referralLedgerEntry.findFirst).mockResolvedValue({
      balanceAfter: new Prisma.Decimal(100),
    } as any);

    await reverseConversionReward({
      paymentInvoiceId: "inv-1001",
      reason: "Customer refunded",
    });

    expect(prisma.referralReward.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REVERSED" }),
      })
    );
    expect(prisma.referralLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "REVERSED",
          amount: new Prisma.Decimal(-41.93),
          balanceAfter: new Prisma.Decimal(58.07),
        }),
      })
    );
  });

  // ─── Test 7: Credit Ledger Application to Invoice ─────────────────────────
  it("applyReferralCreditToInvoice: deducts applied credit and preserves remaining", async () => {
    vi.mocked(prisma.affiliate.findUnique).mockResolvedValue({ id: "aff-1" } as any);
    vi.mocked(prisma.referralLedgerEntry.findFirst).mockResolvedValue({
      balanceAfter: new Prisma.Decimal(500),
    } as any);

    const result = await applyReferralCreditToInvoice({
      userId: "user-1",
      amountToDeduct: 200,
    });

    expect(result.success).toBe(true);
    expect(result.appliedAmount).toBe(200);
    expect(result.remainingBalance).toBe(300);

    expect(prisma.referralLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "APPLIED_TO_INVOICE",
          amount: new Prisma.Decimal(-200),
          balanceAfter: new Prisma.Decimal(300),
        }),
      })
    );
  });
});
