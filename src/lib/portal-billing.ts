// src/lib/portal-billing.ts
// ══════════════════════════════════════════════════════════════════════════════
//  فوترة البورتال — Prepaid Wallet (بدون اشتراك شهري).
//
//  القواعد المثبتة:
//  1. Billing ownership على الـ Project وليس الـ User.
//  2. Trial = 30 رسالة / 30 يوم / مرة واحدة فقط (non-renewable).
//  3. Owner monthly free = 30 كل فترة 30 يوم تبدأ من لحظة التسليم، بدون ترحيل.
//  4. Paid wallet = رصيد مدفوع لا ينتهي، يُستخدم بعد نفاد المجاني.
//  5. ترتيب الخصم: trial → monthly_free → paid_wallet → debt (حتى -MAX Debt صارم).
//  6. سعر الرسالة 0.75ج — Wani service fee (مالوش علاقة بسعر Meta).
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";

export const OTP_PRICE_EGP = 0.75;
export const TRIAL_CREDITS = 30;
export const TRIAL_DAYS = 30;
export const OWNER_MONTHLY_FREE = 30;
export const MONTHLY_PERIOD_DAYS = 30;
export const TOPUP_MIN_EGP = 20;
// لا يوجد حد أقصى للشحن — المبلغ مفتوح بدءًا من 20ج.
// TOPUP_ABS_MAX مجرد حارس sanity ضد الأخطاء المطبعية (مليون جنيه).
export const TOPUP_ABS_MAX_EGP = 1000000;
export const TOPUP_PRESETS = [20, 50, 100, 200];
export const MAX_DEBT_EGP = 10;
export const LOW_BALANCE_MSGS = 10;

export type BillingSource =
  | "trial_credit"
  | "monthly_free"
  | "paid_wallet"
  | "debt";

export interface BillingDecision {
  allowed: boolean;
  source?: BillingSource;
  code?: "TRIAL_EXPIRED" | "MONTHLY_EXHAUSTED" | "INSUFFICIENT_BALANCE" | "NO_ACTIVE_QUOTA";
  error?: string;
}

export function messagesFromBalance(balanceEGP: number): number {
  if (balanceEGP <= 0) return 0;
  return Math.floor(balanceEGP / OTP_PRICE_EGP);
}

export function isValidTopupAmount(amount: unknown): amount is number {
  return (
    typeof amount === "number" &&
    Number.isInteger(amount) &&
    amount >= TOPUP_MIN_EGP &&
    amount <= TOPUP_ABS_MAX_EGP &&
    amount % 5 === 0
  );
}

export function topupError(): string {
  return `مبلغ الشحن لازم يكون ${TOPUP_MIN_EGP} جنيه على الأقل وبمضاعفات 5 (20، 25، 30، ...)`;
}

interface ProjectBillingState {
  id: string;
  ownerId: string | null;
  trialCreditsTotal: number;
  trialCreditsUsed: number;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  monthlyFreeTotal: number;
  monthlyFreeUsed: number;
  monthlyPeriodStart: Date | null;
  monthlyPeriodEnd: Date | null;
  paidBalanceEGP: number;
  createdAt: Date;
}

/** تجديد تلقائي للحصة الشهرية لو انتهت فترتها (بدون ترحيل). يرجع الـ state بعد التجديد. */
export async function renewMonthlyIfNeeded(
  project: ProjectBillingState
): Promise<ProjectBillingState> {
  if (!project.ownerId || !project.monthlyPeriodEnd) return project;
  if (new Date() < project.monthlyPeriodEnd) return project;

  const start = new Date();
  const end = new Date(start.getTime() + MONTHLY_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const updated = await prisma.developerProject.update({
    where: { id: project.id },
    data: {
      monthlyFreeUsed: 0,
      monthlyPeriodStart: start,
      monthlyPeriodEnd: end,
      monthlyRenewNotifiedAt: null,
      lowBalanceNotifiedAt: null,
    },
  });
  await prisma.projectLedgerEntry
    .create({
      data: {
        projectId: project.id,
        usageType: "otp",
        source: "monthly_renew",
        quantity: 0,
        amountEGP: 0,
        balanceAfter: updated.paidBalanceEGP,
      },
    })
    .catch(() => {});
  return { ...project, monthlyFreeUsed: 0, monthlyPeriodStart: start, monthlyPeriodEnd: end };
}

/** بدء الـ Trial لو لم يبدأ (30 يوم من الآن). */
export async function ensureTrialStarted(
  project: ProjectBillingState
): Promise<ProjectBillingState> {
  if (project.trialStartedAt && project.trialEndsAt) return project;
  const start = project.trialStartedAt ?? new Date();
  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const updated = await prisma.developerProject.update({
    where: { id: project.id },
    data: {
      trialStartedAt: start,
      trialEndsAt: end,
      trialCreditsTotal: TRIAL_CREDITS,
    },
  });
  return { ...project, trialStartedAt: start, trialEndsAt: end, trialCreditsTotal: updated.trialCreditsTotal };
}

/**
 * القرار فقط (بدون كتابة) — يُستخدم قبل الإرسال لـ Meta.
 * الكتابة الفعلية تتم في consumeAfterSuccess بعد نجاح Meta فقط.
 */
export function decideSource(project: ProjectBillingState): BillingDecision {
  const now = new Date();

  // 1. Trial
  const trialValid =
    project.trialEndsAt != null &&
    now < project.trialEndsAt &&
    project.trialCreditsUsed < project.trialCreditsTotal;
  if (trialValid) return { allowed: true, source: "trial_credit" };

  // 2. Monthly free (للـ Owner فقط، وبنفس تاريخ انتهاء Trial الأصلي لو لسه ساري — الأولوية للـ Trial فوق)
  if (project.ownerId && project.monthlyPeriodEnd && now < project.monthlyPeriodEnd) {
    if (project.monthlyFreeUsed < project.monthlyFreeTotal) {
      return { allowed: true, source: "monthly_free" };
    }
    // الحصة الشهرية خلصت → ننزل على المحفظة (الشهر الجديد هيجددها تلقائيًا)
  }

  // 3. Paid wallet
  if (project.paidBalanceEGP >= OTP_PRICE_EGP) {
    return { allowed: true, source: "paid_wallet" };
  }

  // 4. Debt — صارم: الرفض لو الناتج سيتجاوز -MAX
  if (project.paidBalanceEGP - OTP_PRICE_EGP >= -MAX_DEBT_EGP) {
    return { allowed: true, source: "debt" };
  }

  return {
    allowed: false,
    code: "INSUFFICIENT_BALANCE",
    error: "انتهى رصيد المشروع ووصل للحد الأقصى للمديونية (10ج) — اشحن الرصيد للاستمرار",
  };
}

/**
 * الخصم الفعلي بعد نجاح إرسال Meta — Transaction واحدة.
 * يُعيد الـ source المستخدم والرصيد الجديد.
 */
export async function consumeAfterSuccess(
  projectId: string,
  source: BillingSource,
  opts: { wabaId?: string | null; phoneNumberId?: string | null; metaMessageId?: string | null } = {}
): Promise<{ source: BillingSource; paidBalanceEGP: number }> {
  if (source === "trial_credit") {
    const p = await prisma.developerProject.update({
      where: { id: projectId },
      data: { trialCreditsUsed: { increment: 1 } },
      select: { paidBalanceEGP: true, trialCreditsUsed: true },
    });
    await prisma.projectLedgerEntry
      .create({
        data: {
          projectId,
          wabaId: opts.wabaId ?? null,
          phoneNumberId: opts.phoneNumberId ?? null,
          usageType: "otp",
          source: "trial_credit",
          quantity: 1,
          amountEGP: 0,
          balanceAfter: p.paidBalanceEGP,
          metaMessageId: opts.metaMessageId ?? null,
        },
      })
      .catch(() => {});
    return { source, paidBalanceEGP: p.paidBalanceEGP };
  }

  if (source === "monthly_free") {
    const p = await prisma.developerProject.update({
      where: { id: projectId },
      data: { monthlyFreeUsed: { increment: 1 } },
      select: { paidBalanceEGP: true },
    });
    await prisma.projectLedgerEntry
      .create({
        data: {
          projectId,
          wabaId: opts.wabaId ?? null,
          phoneNumberId: opts.phoneNumberId ?? null,
          usageType: "otp",
          source: "monthly_free",
          quantity: 1,
          amountEGP: 0,
          balanceAfter: p.paidBalanceEGP,
          metaMessageId: opts.metaMessageId ?? null,
        },
      })
      .catch(() => {});
    return { source, paidBalanceEGP: p.paidBalanceEGP };
  }

  // paid_wallet أو debt — خصم 0.75 من الرصيد (قد يصبح سالبًا حتى -10)
  const p = await prisma.developerProject.update({
    where: { id: projectId },
    data: { paidBalanceEGP: { decrement: OTP_PRICE_EGP } },
    select: { paidBalanceEGP: true },
  });
  const rounded = Math.round(p.paidBalanceEGP * 100) / 100;
  await prisma.projectLedgerEntry
    .create({
      data: {
        projectId,
        wabaId: opts.wabaId ?? null,
        phoneNumberId: opts.phoneNumberId ?? null,
        usageType: "otp",
        source: source === "debt" ? "debt" : "paid_wallet",
        quantity: 1,
        amountEGP: OTP_PRICE_EGP,
        balanceAfter: rounded,
        metaMessageId: opts.metaMessageId ?? null,
      },
    })
    .catch(() => {});
  return { source, paidBalanceEGP: rounded };
}

/** بداية الحصة الشهرية للـ Owner لحظة التسليم (تُستدعى من claim). */
export function newMonthlyPeriod(): { start: Date; end: Date } {
  const start = new Date();
  const end = new Date(start.getTime() + MONTHLY_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}
