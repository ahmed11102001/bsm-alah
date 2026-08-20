// src/lib/payment-requests.ts
// ══════════════════════════════════════════════════════════════════════════════
//  نظام الدفع اليدوي (Manual Payment) — النظام الرسمي الحالي للدفع في التطبيق.
//
//  الـflow: Checkout → إنشاء PaymentRequest (PENDING) → المستخدم يدفع يدويًا
//  ويرسل إثبات الدفع على WhatsApp → الأدمن يراجع الطلب من "المدفوعات" في لوحة
//  التحكم ويضغط تأكيد/رفض → عند التأكيد يتم تفعيل الباقة/الإضافة فعليًا هنا.
//
//  Fawaterak (src/lib/fawaterak.ts) مُعزول ومُعطّل حاليًا — راجع التعليقات هناك
//  وفي src/app/api/payment/checkout/route.ts. لا يوجد أي استدعاء نشط له.
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";
import {
  SUBSCRIPTION_PLANS,
  TOKEN_PACKAGES,
  MCP_ADDON_PACKAGES,
  BILLING_CYCLES,
  computePrice,
  type PlanSlug,
  type BillingCycle,
} from "@/lib/pricing";
import { notifySubscriptionSuccess } from "@/lib/notifications";

export type ManualPaymentType = "subscription" | "token_package" | "mcp_addon";

export class ManualPaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CreateManualPaymentInput {
  type: ManualPaymentType;
  planSlug?: string | null;
  cycle?: string | null;
  packageId?: string | null;
  paymentMethod?: "instapay" | "etisalat" | null;
  useReferralCredit?: boolean;
}

interface ResolvedPurchase {
  productName: string;
  amount: number;
  planSlug: string | null;
  cycle: string | null;
  packageId: string | null;
}

// ─── تحديد سعر واسم المنتج فعليًا من مرجع الأسعار (pricing.ts) — لا يُعتمد على
// أي مبلغ يُرسل من الـclient، تفاديًا للتلاعب بالسعر. ─────────────────────────
async function resolvePurchase(
  ownerId: string,
  input: CreateManualPaymentInput
): Promise<ResolvedPurchase> {
  if (input.type === "subscription") {
    const planSlug = input.planSlug as PlanSlug;
    if (!planSlug || !SUBSCRIPTION_PLANS[planSlug]) {
      throw new ManualPaymentError("الباقة غير صالحة");
    }
    const plan = SUBSCRIPTION_PLANS[planSlug];
    const billingCycle: BillingCycle =
      planSlug === "starter"
        ? "monthly"
        : BILLING_CYCLES[input.cycle as BillingCycle]
        ? (input.cycle as BillingCycle)
        : "monthly";
    const cycleInfo = BILLING_CYCLES[billingCycle];
    const baseAmount = computePrice(plan.monthly, billingCycle) * cycleInfo.months;

    // رصيد الإحالات (إن وُجد) يُخصم فعليًا فقط عند تأكيد الأدمن للطلب —
    // هنا بنحسبه بس عشان نحدد "المبلغ المطلوب دفعه" الصحيح.
    let creditApplied = 0;
    if (input.useReferralCredit !== false) {
      const { getAvailableReferralCredit } = await import("@/lib/referral/service");
      const availableCredit = await getAvailableReferralCredit(ownerId);
      if (availableCredit > 0) creditApplied = Math.min(availableCredit, baseAmount);
    }

    return {
      productName: `اشتراك ${plan.name} — ${cycleInfo.label}`,
      amount: Math.max(0, baseAmount - creditApplied),
      planSlug,
      cycle: billingCycle,
      packageId: null,
    };
  }

  if (input.type === "token_package") {
    const sub = await prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: true },
    });
    if (!sub || sub.plan !== "enterprise") {
      throw new ManualPaymentError("باقات التوكن الإضافية متاحة لمشتركي Enterprise فقط", 403);
    }
    const pkg = TOKEN_PACKAGES.find((p) => p.id === input.packageId);
    if (!pkg) throw new ManualPaymentError("حزمة التوكن غير صالحة");

    return {
      productName: pkg.label,
      amount: pkg.priceEGP,
      planSlug: null,
      cycle: null,
      packageId: pkg.id,
    };
  }

  if (input.type === "mcp_addon") {
    const sub = await prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: true },
    });
    if (!sub || sub.plan === "free" || sub.plan === "starter") {
      throw new ManualPaymentError(
        "إضافة Claude غير المحدودة متاحة لمشتركي Professional وما فوقها",
        403
      );
    }
    const pkg = MCP_ADDON_PACKAGES.find((p) => p.id === input.packageId);
    if (!pkg) throw new ManualPaymentError("حزمة Claude غير صالحة");

    return {
      productName: pkg.label,
      amount: pkg.priceEGP,
      planSlug: null,
      cycle: null,
      packageId: pkg.id,
    };
  }

  throw new ManualPaymentError("نوع عملية غير معروف");
}

// ─── إنشاء طلب دفع جديد (PENDING) — بيمنع التكرار غير المقصود لنفس العملية ──
export async function createManualPaymentRequest(
  ownerId: string,
  input: CreateManualPaymentInput
) {
  const resolved = await resolvePurchase(ownerId, input);

  const existing = await prisma.paymentRequest.findFirst({
    where: {
      userId: ownerId,
      type: input.type,
      status: "PENDING",
      planSlug: resolved.planSlug,
      cycle: resolved.cycle,
      packageId: resolved.packageId,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { request: existing, reused: true as const };

  const request = await prisma.paymentRequest.create({
    data: {
      userId: ownerId,
      type: input.type,
      planSlug: resolved.planSlug,
      cycle: resolved.cycle,
      packageId: resolved.packageId,
      productName: resolved.productName,
      amount: resolved.amount,
      currency: "EGP",
      paymentMethod: input.paymentMethod ?? null,
      status: "PENDING",
    },
  });

  return { request, reused: false as const };
}

// ─── تأكيد الدفع: يفعّل الباقة/الإضافة فعليًا في الـDB ───────────────────────
export async function approvePaymentRequest(requestId: string, adminId: string) {
  const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ManualPaymentError("الطلب غير موجود", 404);
  if (request.status !== "PENDING") {
    throw new ManualPaymentError("تمت مراجعة هذا الطلب بالفعل", 400);
  }

  const now = new Date();

  if (request.type === "subscription") {
    const planSlug = request.planSlug as PlanSlug | null;
    if (!planSlug || !SUBSCRIPTION_PLANS[planSlug]) {
      throw new ManualPaymentError("بيانات الباقة غير صالحة في الطلب", 400);
    }
    const plan = SUBSCRIPTION_PLANS[planSlug];
    const billingCycle: BillingCycle =
      request.cycle && BILLING_CYCLES[request.cycle as BillingCycle]
        ? (request.cycle as BillingCycle)
        : "monthly";
    const cycleInfo = BILLING_CYCLES[billingCycle];
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + cycleInfo.months);

    // الفرق بين السعر الأساسي والمبلغ المسجّل بالطلب = رصيد الإحالات اللي
    // كان مطبّق وقت إنشاء الطلب — يُخصم من رصيد المستخدم دلوقتي بعد التأكيد.
    const baseAmount = computePrice(plan.monthly, billingCycle) * cycleInfo.months;
    const creditApplied = Math.max(0, baseAmount - request.amount);

    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedAt: now, reviewedById: adminId },
      }),
      prisma.subscription.upsert({
        where: { userId: request.userId },
        update: {
          plan: planSlug,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          campaignsUsedThisMonth: 0,
          mcpCommandsUsedThisMonth: 0,
          aiTokensUsedThisMonth: 0,
          periodResetAt: now,
        },
        create: {
          userId: request.userId,
          plan: planSlug,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    if (creditApplied > 0) {
      const { applyReferralCreditToInvoice } = await import("@/lib/referral/service");
      await applyReferralCreditToInvoice({
        userId: request.userId,
        amountToDeduct: creditApplied,
        description: `تغطية جزء من اشتراك ${plan.name} من رصيد الإحالات (دفع يدوي)`,
      }).catch((err) => console.error("[ManualPayment] فشل خصم رصيد الإحالات:", err));
    }

    await notifySubscriptionSuccess(request.userId, plan.name).catch(() => {});
  } else if (request.type === "token_package") {
    const pkg = TOKEN_PACKAGES.find((p) => p.id === request.packageId);
    if (!pkg) throw new ManualPaymentError("بيانات الحزمة غير صالحة في الطلب", 400);

    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedAt: now, reviewedById: adminId },
      }),
      prisma.subscription.update({
        where: { userId: request.userId },
        data: { aiTokensBonusBalance: { increment: pkg.tokens } },
      }),
    ]);
  } else if (request.type === "mcp_addon") {
    const pkg = MCP_ADDON_PACKAGES.find((p) => p.id === request.packageId);
    if (!pkg) throw new ManualPaymentError("بيانات الحزمة غير صالحة في الطلب", 400);

    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedAt: now, reviewedById: adminId },
      }),
      // نفس الحيلة المستخدمة في addMCPCommandsBonus (src/lib/plan-guard.ts)
      // وفي webhook فواتيرك القديم: تنقيص العداد بعدد كبير جدًا يخلي أوامر
      // MCP فعليًا غير محدودة لحد ما يتصفّر العداد آخر الشهر (periodResetAt).
      prisma.subscription.update({
        where: { userId: request.userId },
        data: { mcpCommandsUsedThisMonth: { decrement: 999_999 } },
      }),
    ]);
  }

  return prisma.paymentRequest.findUnique({ where: { id: requestId } });
}

// ─── رفض الدفع: لا يتم تفعيل أي شيء ──────────────────────────────────────────
export async function rejectPaymentRequest(
  requestId: string,
  adminId: string,
  reason?: string | null
) {
  const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ManualPaymentError("الطلب غير موجود", 404);
  if (request.status !== "PENDING") {
    throw new ManualPaymentError("تمت مراجعة هذا الطلب بالفعل", 400);
  }

  return prisma.paymentRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: adminId,
      rejectionReason: reason ?? null,
    },
  });
}
