// src/__tests__/plan-guard.test.ts
// ─── اختبار Plan Guard ─────────────────────────────────────────────────────────
// ده اللي بيمنع اليوزر من تخطي حدود باقته.
// لو فيه bug هنا:
//   - يوزر free يبعت حملات unlimited → خسارة مالية
//   - enterprise بيتبلوك من ميزة هو المفروض يوصلها
//   - beta users مش بياخدوا الـ bypass اللي المفروض يحصلهم

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockPrisma = {
  subscription: {
    findUnique: vi.fn(),
    update:     vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    count:      vi.fn(),
  },
  contact: {
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/notifications", () => ({
  notifyPlanLimitReached: vi.fn(),
}));

const {
  checkContactsLimit,
  checkCampaignsLimit,
  checkTeamLimit,
  checkFeature,
  incrementCampaignUsage,
  getPlanStatus,
  guardResponse,
} = await import("@/lib/plan-guard");

// ─── Helper: اعمل subscription stub ──────────────────────────────────────────
function makeSub(plan: string, overrides = {}) {
  return {
    plan,
    status:                 "active",
    isBetaUser:             false,
    campaignsUsedThisMonth: 0,
    periodResetAt:          new Date(), // نفس الشهر → مفيش تصفير
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // الافتراضي: مش super admin
  mockPrisma.user.findUnique.mockResolvedValue({ isSuper: false });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("checkContactsLimit", () => {
  it("free plan — تحت الحد (50/100) → allowed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
    mockPrisma.contact.count.mockResolvedValue(50);

    const result = await checkContactsLimit("user_1");
    expect(result.allowed).toBe(true);
  });

  it("free plan — وصل الحد (100/100) → رفض", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
    mockPrisma.contact.count.mockResolvedValue(100);

    const result = await checkContactsLimit("user_1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("LIMIT_REACHED");
      expect(result.limit).toBe(100);
      expect(result.used).toBe(100);
    }
  });

  it("free plan — يضيف أكتر من اللي باقي → رفض", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
    mockPrisma.contact.count.mockResolvedValue(95);

    const result = await checkContactsLimit("user_1", 10); // 95+10 > 100
    expect(result.allowed).toBe(false);
  });

  it("enterprise plan — unlimited → دايماً allowed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("enterprise"));
    mockPrisma.contact.count.mockResolvedValue(999_999);

    const result = await checkContactsLimit("user_1");
    expect(result.allowed).toBe(true);
  });

  it("مفيش subscription → fallback لـ free", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.contact.count.mockResolvedValue(90);

    const result = await checkContactsLimit("user_1", 20); // 90+20 > 100
    expect(result.allowed).toBe(false);
  });

  it("super admin → دايماً allowed بغض النظر عن الحد", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isSuper: true });
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
    mockPrisma.contact.count.mockResolvedValue(999);

    const result = await checkContactsLimit("super_user");
    expect(result.allowed).toBe(true);
  });

  it("beta user → دايماً allowed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isSuper: false });
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", { isBetaUser: true })
    );

    const result = await checkContactsLimit("beta_user");
    expect(result.allowed).toBe(true);
  });

  it("starter plan — 2000 contacts limit", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("starter"));
    mockPrisma.contact.count.mockResolvedValue(1999);

    const okResult = await checkContactsLimit("user_1", 1);
    expect(okResult.allowed).toBe(true);

    mockPrisma.contact.count.mockResolvedValue(2000);
    const failResult = await checkContactsLimit("user_1", 1);
    expect(failResult.allowed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("checkCampaignsLimit", () => {
  it("free plan — تحت الحد (2/3) → allowed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", { campaignsUsedThisMonth: 2 })
    );

    const result = await checkCampaignsLimit("user_1");
    expect(result.allowed).toBe(true);
  });

  it("free plan — وصل الحد (3/3) → رفض", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", { campaignsUsedThisMonth: 3 })
    );

    const result = await checkCampaignsLimit("user_1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("LIMIT_REACHED");
      expect(result.limit).toBe(3);
      expect(result.requiredPlan).toBe("starter");
    }
  });

  it("pro plan — unlimited campaigns → دايماً allowed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("pro", { campaignsUsedThisMonth: 9999 })
    );

    const result = await checkCampaignsLimit("user_1");
    expect(result.allowed).toBe(true);
  });

  it("شهر جديد → العداد بيتصفر تلقائياً", async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", {
        campaignsUsedThisMonth: 3, // كان وصل الحد
        periodResetAt: lastMonth,  // لكن في الشهر اللي فات
      })
    );
    mockPrisma.subscription.update.mockResolvedValue({});

    const result = await checkCampaignsLimit("user_1");
    // بعد التصفير، العداد = 0 وهو أقل من 3
    expect(result.allowed).toBe(true);
    // لازم يعمل update عشان يصفر
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignsUsedThisMonth: 0 }),
      })
    );
  });

  it("starter plan — 50 حملة/شهر", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("starter", { campaignsUsedThisMonth: 50 })
    );

    const result = await checkCampaignsLimit("user_1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.limit).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("checkTeamLimit", () => {
  it("free plan — 1 member فقط (المالك) → مينفعش يضيف حد", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
    mockPrisma.user.count.mockResolvedValue(0); // 0 members + 1 owner = 1 = الحد

    const result = await checkTeamLimit("user_1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.limit).toBe(1);
    }
  });

  it("starter plan — يقدر يضيف member واحد", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("starter")); // limit=2
    mockPrisma.user.count.mockResolvedValue(0); // 0 members → يقدر يضيف 1

    const result = await checkTeamLimit("user_1");
    expect(result.allowed).toBe(true);
  });

  it("starter plan — 2 members → مينفعش يضيف (الحد 2 بما فيهم المالك)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("starter")); // limit=2
    mockPrisma.user.count.mockResolvedValue(1); // 1 member + 1 owner = 2 = الحد

    const result = await checkTeamLimit("user_1");
    expect(result.allowed).toBe(false);
  });

  it("enterprise — unlimited team → دايماً allowed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("enterprise"));
    mockPrisma.user.count.mockResolvedValue(999);

    const result = await checkTeamLimit("user_1");
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("checkFeature", () => {
  // ─── Features بتحتاج starter ───────────────────────────────────────────────
  const starterFeatures = ["scheduledCampaigns", "mediaMessages", "customAudiences"] as const;

  for (const feature of starterFeatures) {
    it(`${feature} — free → مرفوض`, async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));
      const result = await checkFeature("user_1", feature);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("FEATURE_LOCKED");
        expect(result.requiredPlan).toBe("starter");
      }
    });

    it(`${feature} — starter → مسموح`, async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("starter"));
      const result = await checkFeature("user_1", feature);
      expect(result.allowed).toBe(true);
    });
  }

  // ─── Features بتحتاج pro ────────────────────────────────────────────────────
  it("advancedReports — pro → مسموح", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("pro"));
    const result = await checkFeature("user_1", "advancedReports");
    expect(result.allowed).toBe(true);
  });

  it("advancedReports — starter → مرفوض", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("starter"));
    const result = await checkFeature("user_1", "advancedReports");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.requiredPlan).toBe("pro");
  });

  it("storeIntegration — pro → مسموح", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("pro"));
    const result = await checkFeature("user_1", "storeIntegration");
    expect(result.allowed).toBe(true);
  });

  // ─── Features بتحتاج enterprise ────────────────────────────────────────────
  it("aiAgent — enterprise → مسموح", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("enterprise"));
    const result = await checkFeature("user_1", "aiAgent");
    expect(result.allowed).toBe(true);
  });

  it("aiAgent — pro → مرفوض", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("pro"));
    const result = await checkFeature("user_1", "aiAgent");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.requiredPlan).toBe("enterprise");
  });

  it("apiAccess — enterprise فقط", async () => {
    for (const plan of ["free", "starter", "pro"] as const) {
      mockPrisma.subscription.findUnique.mockResolvedValue(makeSub(plan));
      const result = await checkFeature("user_1", "apiAccess");
      expect(result.allowed).toBe(false);
    }
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("enterprise"));
    const result = await checkFeature("user_1", "apiAccess");
    expect(result.allowed).toBe(true);
  });

  it("super admin بيعدي الـ feature lock", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isSuper: true });
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("free"));

    const result = await checkFeature("super_user", "aiAgent");
    expect(result.allowed).toBe(true);
  });

  it("beta user بيعدي الـ feature lock", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ isSuper: false });
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", { isBetaUser: true })
    );

    const result = await checkFeature("beta_user", "aiAgent");
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("incrementCampaignUsage", () => {
  it("بيزوّد العداد بـ 1 للباقات المحدودة", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("free", { campaignsUsedThisMonth: 1 })
    );
    mockPrisma.subscription.update.mockResolvedValue({});

    await incrementCampaignUsage("user_1");

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { campaignsUsedThisMonth: { increment: 1 } },
      })
    );
  });

  it("unlimited plan → ما بيعملش update (مش محتاجين نعد)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(makeSub("enterprise"));

    await incrementCampaignUsage("user_1");

    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("مفيش subscription → ما بيعملش حاجة (مش بيكسر)", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(incrementCampaignUsage("user_1")).resolves.toBeUndefined();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("guardResponse", () => {
  it("allowed:true → بيرجع null (كمّل)", () => {
    const res = guardResponse({ allowed: true });
    expect(res).toBeNull();
  });

  it("allowed:false → NextResponse بـ 403", () => {
    const res = guardResponse({
      allowed:      false,
      code:         "LIMIT_REACHED",
      message:      "وصلت للحد الأقصى",
      plan:         "free",
      requiredPlan: "starter",
      limit:        100,
      used:         100,
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe("getPlanStatus", () => {
  it("بيرجع usage صحيح", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      makeSub("pro", { campaignsUsedThisMonth: 10 })
    );
    mockPrisma.contact.count.mockResolvedValue(500);
    mockPrisma.user.count.mockResolvedValue(3); // 3 members + 1 owner

    const status = await getPlanStatus("user_1");

    expect(status.plan).toBe("pro");
    expect(status.usage.contacts).toBe(500);
    expect(status.usage.teamMembers).toBe(4); // +1 للمالك
    expect(status.usage.campaignsThisMonth).toBe(10);
  });

  it("مفيش subscription → fallback لـ free", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.contact.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(0);

    const status = await getPlanStatus("user_1");
    expect(status.plan).toBe("free");
  });
});