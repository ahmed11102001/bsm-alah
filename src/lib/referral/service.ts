// src/lib/referral/service.ts
// ══════════════════════════════════════════════════════════════════════════════
//  خدمة إدارة الإحالات والعمولات (Referral & Affiliate Service)
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getReferralRate, getReferralRatesForAllPlans, computeRewardAmount } from "./commission";
import type { ReferralStatusResponse, ReferralHistoryItem } from "./types";
import crypto from "crypto";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://aiwni.com").replace(/\/$/, "");

/**
 * توليد كود إحالة فريد ونظيف (مثل: AHMED82 أو WANI931)
 */
export async function generateUniqueReferralCode(nameOrEmail?: string | null): Promise<string> {
  let prefix = "WANI";
  if (nameOrEmail) {
    const cleaned = nameOrEmail
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 5);
    if (cleaned.length >= 3) {
      prefix = cleaned;
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digits
    const candidate = `${prefix}${randomNum}`;

    const existing = await prisma.affiliate.findUnique({
      where: { code: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  // Fallback عشوائي آمن
  return `REF${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * جلب أو إنشاء كيان Affiliate للمستخدم المؤهل (Paid User)
 */
export async function getOrCreateAffiliateForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
      affiliate: true,
    },
  });

  if (!user) {
    return { eligible: false, affiliate: null, reason: "USER_NOT_FOUND" };
  }

  const sub = user.subscription;
  const isPaid = sub && sub.plan !== "free" && sub.status === "active";

  if (!isPaid) {
    return { eligible: false, affiliate: user.affiliate, reason: "NOT_PAID_PLAN" };
  }

  if (user.affiliate) {
    return { eligible: true, affiliate: user.affiliate, reason: "EXISTING" };
  }

  // إنشاء Affiliate record جديد عند أول طلب
  const code = await generateUniqueReferralCode(user.name || user.email);

  const affiliate = await prisma.affiliate.create({
    data: {
      userId: user.id,
      code,
      name: user.name || "Wani Partner",
      status: "ACTIVE",
    },
  });

  return { eligible: true, affiliate, reason: "CREATED" };
}

/**
 * جلب إحصائيات وحالة الـ Referral للـ User
 */
export async function getAffiliateStatus(userId: string): Promise<ReferralStatusResponse> {
  const result = await getOrCreateAffiliateForUser(userId);

  if (!result.eligible || !result.affiliate) {
    return {
      isEligible: false,
      code: null,
      referralLink: null,
      qualifiedCount: 0,
      pendingCount: 0,
      currentRate: 0,
      minCurrentRate: 0,
      maxCurrentRate: 0,
      bonusRate: 0,
      ratesByPlan: {
        starter: { baseRate: 0, bonusRate: 0, finalRate: 0 },
        pro: { baseRate: 0, bonusRate: 0, finalRate: 0 },
        enterprise: { baseRate: 0, bonusRate: 0, finalRate: 0 },
      },
      creditBalance: 0,
      totalEarned: 0,
    };
  }

  const affiliate = result.affiliate;

  // جلب إحصائيات الإحالات والمكافآت
  const [qualifiedCount, pendingCount, ledgerLastEntry, totalEarnedAgg] = await Promise.all([
    prisma.referral.count({
      where: { affiliateId: affiliate.id, status: "QUALIFIED" },
    }),
    prisma.referral.count({
      where: { affiliateId: affiliate.id, status: "PENDING" },
    }),
    prisma.referralLedgerEntry.findFirst({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    }),
    prisma.referralReward.aggregate({
      where: { affiliateId: affiliate.id, status: "APPROVED" },
      _sum: { rewardAmount: true },
    }),
  ]);

  // لا توجد "باقة للمالك" تحدد النسبة. النسبة تتحدد فقط بباقة العميل المُحال.
  const rates = getReferralRatesForAllPlans(qualifiedCount);
  const minCurrentRate = Math.min(
    rates.starter.finalRate,
    rates.pro.finalRate,
    rates.enterprise.finalRate,
  );
  const maxCurrentRate = Math.max(
    rates.starter.finalRate,
    rates.pro.finalRate,
    rates.enterprise.finalRate,
  );
  const bonusRate = Math.min(qualifiedCount * 0.03, 0.50 - 0.10);
  const creditBalance = ledgerLastEntry ? Number(ledgerLastEntry.balanceAfter) : 0;
  const totalEarned = totalEarnedAgg._sum.rewardAmount ? Number(totalEarnedAgg._sum.rewardAmount) : 0;

  return {
    isEligible: true,
    code: affiliate.code,
    referralLink: `${APP_URL}/?ref=${affiliate.code}`,
    qualifiedCount,
    pendingCount,
    currentRate: maxCurrentRate,
    minCurrentRate,
    maxCurrentRate,
    bonusRate,
    ratesByPlan: {
      starter: {
        baseRate: rates.starter.baseRate,
        bonusRate: rates.starter.bonusRate,
        finalRate: rates.starter.finalRate,
      },
      pro: {
        baseRate: rates.pro.baseRate,
        bonusRate: rates.pro.bonusRate,
        finalRate: rates.pro.finalRate,
      },
      enterprise: {
        baseRate: rates.enterprise.baseRate,
        bonusRate: rates.enterprise.bonusRate,
        finalRate: rates.enterprise.finalRate,
      },
    },
    creditBalance,
    totalEarned,
  };
}

/**
 * جلب سجل الإحالات مع إخفاء البيانات الحساسة للمستخدم المحال
 */
export async function getAffiliateHistory(userId: string): Promise<ReferralHistoryItem[]> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!affiliate) return [];

  const referrals = await prisma.referral.findMany({
    where: { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
    include: {
      referredUser: {
        select: {
          name: true,
          email: true,
        },
      },
      rewards: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return referrals.map((ref) => {
    // إخفاء الاسم والبريد لحماية الخصوصية (مثلاً: أحمد م. أو عميل جديد)
    let maskedName = "عميل جديد";
    if (ref.referredUser?.name) {
      const parts = ref.referredUser.name.trim().split(" ");
      maskedName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
    }

    const reward = ref.rewards[0];

    return {
      id: ref.id,
      referredName: maskedName,
      status: ref.status,
      signedUpAt: ref.signedUpAt.toISOString(),
      qualifiedAt: ref.qualifiedAt ? ref.qualifiedAt.toISOString() : null,
      reward: reward ? {
        baseRate: Number(reward.baseRate),
        appliedRate: Number(reward.appliedRate),
        baseAmount: Number(reward.baseAmount),
        rewardAmount: Number(reward.rewardAmount),
        status: reward.status,
      } : null,
    };
  });
}

/**
 * تسجيل ربط إحالة جديد عند الـ Signup (First-Touch Attribution)
 */
export async function trackReferralSignup({
  referredUserId,
  refCode,
}: {
  referredUserId: string;
  refCode?: string | null;
}) {
  if (!refCode) return null;

  const cleanCode = refCode.trim().toUpperCase();
  if (!cleanCode) return null;

  // 1. العثور على الـ Affiliate
  const affiliate = await prisma.affiliate.findUnique({
    where: { code: cleanCode },
    select: { id: true, userId: true, code: true, status: true },
  });

  if (!affiliate || affiliate.status !== "ACTIVE") {
    return null;
  }

  // 2. منع الإحالة الذاتية
  if (affiliate.userId && affiliate.userId === referredUserId) {
    return null;
  }

  // 3. التحقق هل المستخدم لديه إحالة سابقة مسجلة (First-touch attribution)
  const existingReferral = await prisma.referral.findUnique({
    where: { referredUserId },
  });

  if (existingReferral) {
    return existingReferral; // لا نغيّر الإحالة الموجودة بالفعل
  }

  // 4. إنشاء الـ Referral record
  try {
    const referral = await prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId,
        status: "PENDING",
        signedUpAt: new Date(),
      },
    });

    console.info(`[Referral] Linked user ${referredUserId} to affiliate ${affiliate.code} (${affiliate.id})`);
    return referral;
  } catch (err: any) {
    console.error("[Referral] Error creating referral attribution:", err?.message ?? err);
    return null;
  }
}

/**
 * معالجة تحويل الإحالة (Conversion) عند الاشتراك المدفوع الأول بنجاح
 * Idempotent & Transaction-safe
 */
export async function processConversionReward({
  referredUserId,
  subscriptionId,
  paymentInvoiceId,
  amountPaid,
}: {
  referredUserId: string;
  subscriptionId?: string;
  paymentInvoiceId?: string;
  amountPaid: number;
}) {
  if (!referredUserId || amountPaid <= 0) return null;

  // 1. جلب سجل الإحالة للمستخدم المعني
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: {
      affiliate: {
        include: {
          user: {
            include: {
              subscription: true,
            },
          },
        },
      },
      referredUser: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (!referral) {
    return null; // ليس قادمًا من إحالة
  }

  // في المرحلة الأولى: المكافأة تُحتسب لأول اشتراك مدفوع ناجح فقط
  if (referral.status === "QUALIFIED") {
    console.info(`[Referral] User ${referredUserId} referral is already qualified, skipping duplicate reward.`);
    return null;
  }

  // 2. منع تكرار المكافأة بنفس الفاتورة (Idempotency Protection)
  if (paymentInvoiceId) {
    const existingReward = await prisma.referralReward.findUnique({
      where: { paymentInvoiceId: String(paymentInvoiceId) },
    });
    if (existingReward) {
      console.info(`[Referral] Reward already exists for invoice ${paymentInvoiceId}`);
      return existingReward;
    }
  }

  // 3. التحقق من أهلية صاحب الإحالة (Affiliate Owner)
  const affiliate = referral.affiliate;
  const ownerSub = affiliate.user?.subscription;
  const ownerPlan = (ownerSub?.plan ?? "free").toLowerCase();

  if (ownerPlan === "free" || ownerSub?.status !== "active") {
    console.info(`[Referral] Affiliate owner ${affiliate.userId} is not on active paid plan (${ownerPlan}), skipping reward.`);
    return null;
  }

  // 4. الباقة مصدرها اشتراك العميل المُحال نفسه، وليس اشتراك الـ Affiliate.
  const referredPlan = (referral.referredUser?.subscription?.plan ?? "free").toLowerCase();

  if (referredPlan === "free") {
    console.info(`[Referral] Referred user ${referredUserId} has no paid plan, skipping reward.`);
    return null;
  }

  // 5. تنفيذ الحساب والتحديث داخل Transaction. العد السابق يتم داخل نفس
  // الـ transaction حتى لا نعتمد على قيمة يرسلها الـ frontend أو الـ webhook.
  return await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
    const qualifiedCountBefore = await tx.referral.count({
      where: { affiliateId: affiliate.id, status: "QUALIFIED" },
    });

    const rateInfo = getReferralRate({
      referredPlan,
      previousQualifiedReferrals: qualifiedCountBefore,
    });

    if (!rateInfo.eligible || rateInfo.finalRate <= 0) {
      return null;
    }

    const { rate, baseAmount, rewardAmount } = computeRewardAmount(
      amountPaid,
      rateInfo.finalRate,
    );

    if (rewardAmount <= 0) return null;

    // تحديث الحالة أولًا. لو كان webhook آخر قد سبق وحوّل هذا الـ referral،
    // لن نُنشئ Reward ثانية.
    const updatedReferral = await tx.referral.updateMany({
      where: {
        id: referral.id,
        status: "PENDING",
      },
      data: {
        status: "QUALIFIED",
        qualifiedAt: new Date(),
      },
    });

    if (updatedReferral.count !== 1) {
      return null;
    }

    // rate = appliedRate المحفوظ وقت التحويل.
    // baseRate منفصل حتى تظل النسبة الأصلية قابلة للتدقيق لاحقًا.
    const reward = await tx.referralReward.create({
      data: {
        affiliateId: affiliate.id,
        referralId: referral.id,
        referredUserId,
        subscriptionId: subscriptionId ?? null,
        paymentInvoiceId: paymentInvoiceId ? String(paymentInvoiceId) : null,
        baseRate: new Prisma.Decimal(rateInfo.baseRate),
        appliedRate: new Prisma.Decimal(rate),
        baseAmount: new Prisma.Decimal(baseAmount),
        rewardAmount: new Prisma.Decimal(rewardAmount),
        status: "APPROVED",
      },
    });

    // حساب الرصيد الجديد في الـ Ledger
    const lastLedger = await tx.referralLedgerEntry.findFirst({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    });

    const previousBalance = lastLedger ? Number(lastLedger.balanceAfter) : 0;
    const newBalance = Math.round((previousBalance + rewardAmount) * 100) / 100;

    await tx.referralLedgerEntry.create({
      data: {
        affiliateId: affiliate.id,
        type: "EARNED",
        amount: new Prisma.Decimal(rewardAmount),
        balanceAfter: new Prisma.Decimal(newBalance),
        referenceId: reward.id,
        description: `مكافأة إحالة عميل جديد (${(rate * 100).toFixed(0)}% من ${baseAmount} ج.م)`,
      },
    });

    console.info(`[Referral] ✅ Conversion Reward Created: affiliate=${affiliate.code}, amount=${rewardAmount} EGP, rate=${(rate * 100).toFixed(0)}%, newBalance=${newBalance} EGP`);

      return reward;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * استرداد / عكس مكافأة إحالة في حالة الـ Refund أو إلغاء الدفع
 */
export async function reverseConversionReward({
  paymentInvoiceId,
  reason = "Refund or Chargeback",
}: {
  paymentInvoiceId: string;
  reason?: string;
}) {
  const reward = await prisma.referralReward.findUnique({
    where: { paymentInvoiceId: String(paymentInvoiceId) },
  });

  if (!reward || reward.status !== "APPROVED") {
    return null;
  }

  const rewardAmount = Number(reward.rewardAmount);

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. تحديث حالة المكافأة
    await tx.referralReward.update({
      where: { id: reward.id },
      data: {
        status: "REVERSED",
        reversalReason: reason,
      },
    });

    // 2. تحديث حالة الـ Referral
    await tx.referral.update({
      where: { id: reward.referralId },
      data: {
        status: "REVERSED",
      },
    });

    // 3. خصم المبلغ من الـ Ledger
    const lastLedger = await tx.referralLedgerEntry.findFirst({
      where: { affiliateId: reward.affiliateId },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    });

    const previousBalance = lastLedger ? Number(lastLedger.balanceAfter) : 0;
    const newBalance = Math.max(0, Math.round((previousBalance - rewardAmount) * 100) / 100);

    await tx.referralLedgerEntry.create({
      data: {
        affiliateId: reward.affiliateId,
        type: "REVERSED",
        amount: new Prisma.Decimal(-rewardAmount),
        balanceAfter: new Prisma.Decimal(newBalance),
        referenceId: reward.id,
        description: `استرداد مكافأة إحالة: ${reason}`,
      },
    });

    console.info(`[Referral] ↩️ Reward Reversed: rewardId=${reward.id}, amount=-${rewardAmount} EGP, newBalance=${newBalance} EGP`);
    return reward;
  });
}

/**
 * جلب رصيد الكريديت المتاح للاستخدام في الاشتراك
 */
export async function getAvailableReferralCredit(userId: string): Promise<number> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!affiliate) return 0;

  const lastLedger = await prisma.referralLedgerEntry.findFirst({
    where: { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });

  return lastLedger ? Math.max(0, Number(lastLedger.balanceAfter)) : 0;
}

/**
 * تطبيق رصيد الإحالات على فاتورة اشتراك (خصم من الرصيد)
 */
export async function applyReferralCreditToInvoice({
  userId,
  amountToDeduct,
  invoiceId,
  description = "استخدام رصيد الإحالات لتقليل قيمة الاشتراك",
}: {
  userId: string;
  amountToDeduct: number;
  invoiceId?: string;
  description?: string;
}) {
  if (amountToDeduct <= 0) {
    return { success: false, appliedAmount: 0, previousBalance: 0, remainingBalance: 0 };
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!affiliate) {
    return { success: false, appliedAmount: 0, previousBalance: 0, remainingBalance: 0 };
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const lastLedger = await tx.referralLedgerEntry.findFirst({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    });

    const currentBalance = lastLedger ? Number(lastLedger.balanceAfter) : 0;
    if (currentBalance <= 0) {
      return { success: false, appliedAmount: 0, previousBalance: 0, remainingBalance: 0 };
    }

    const appliedAmount = Math.min(currentBalance, amountToDeduct);
    const newBalance = Math.round((currentBalance - appliedAmount) * 100) / 100;

    await tx.referralLedgerEntry.create({
      data: {
        affiliateId: affiliate.id,
        type: "APPLIED_TO_INVOICE",
        amount: new Prisma.Decimal(-appliedAmount),
        balanceAfter: new Prisma.Decimal(newBalance),
        referenceId: invoiceId ?? null,
        description: `${description} (-${appliedAmount} ج.م)`,
      },
    });

    console.info(`[Referral] Credit applied for user ${userId}: -${appliedAmount} EGP, remaining balance: ${newBalance} EGP`);

    return {
      success: true,
      appliedAmount,
      previousBalance: currentBalance,
      remainingBalance: newBalance,
    };
  });
}
