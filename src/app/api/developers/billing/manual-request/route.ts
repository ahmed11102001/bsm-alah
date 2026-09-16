import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDevSessionFromRequest } from "@/lib/dev-auth";
import { devError } from "@/lib/dev-errors";
import { getProjectForOwnerOrDeveloper } from "@/lib/dev-project-auth";
import {
  TOPUP_MIN_EGP,
  TOPUP_ABS_MAX_EGP,
  OTP_PRICE_EGP,
  isValidTopupAmount,
  topupError,
  messagesFromBalance,
} from "@/lib/portal-billing";

export async function GET(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return devError("projectId is required", "INVALID_REQUEST", 400);

  // الرصيد ظاهر للمطور والأونر — نفس الصلاحية
  const project = await getProjectForOwnerOrDeveloper(projectId, session.id);
  if (!project) return devError("المشروع مش موجود أو مش بتاعك", "NOT_FOUND", 404);

  const pending = await prisma.paymentRequest.findFirst({
    where: { developerProjectId: projectId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const ledger = await prisma.projectLedgerEntry.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, source: true, usageType: true, quantity: true,
      amountEGP: true, balanceAfter: true, createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    pending,
    ledger,
    wallet: {
      paidBalanceEGP: project.paidBalanceEGP,
      messagesAvailable: messagesFromBalance(project.paidBalanceEGP),
      trial: {
        used: project.trialCreditsUsed,
        total: project.trialCreditsTotal,
        endsAt: project.trialEndsAt,
      },
      monthly: {
        used: project.monthlyFreeUsed,
        total: project.monthlyFreeTotal,
        endsAt: project.monthlyPeriodEnd,
        active: !!project.ownerId,
      },
    },
    limits: {
      min: TOPUP_MIN_EGP,
      absMax: TOPUP_ABS_MAX_EGP,
      pricePerMessage: OTP_PRICE_EGP,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getDevSessionFromRequest(req);
  if (!session) return devError("unauthenticated", "AUTH_REQUIRED", 401);

  const { projectId, amount, paymentMethod } = await req.json().catch(() => ({}));
  if (!projectId) return devError("projectId is required", "INVALID_REQUEST", 400);
  if (!isValidTopupAmount(amount)) {
    return devError(topupError(), "INVALID_REQUEST", 400);
  }
  if (paymentMethod && !["instapay", "etisalat"].includes(paymentMethod)) {
    return devError("طريقة دفع غير صالحة", "INVALID_REQUEST", 400);
  }

  // المطور (قبل التسليم) والأونر (بعده) يقدروا يشحنوا
  const project = await getProjectForOwnerOrDeveloper(projectId, session.id);
  if (!project) return devError("المشروع مش موجود أو مش بتاعك", "NOT_FOUND", 404);

  // منع تكرار طلب pending لنفس المشروع
  const existing = await prisma.paymentRequest.findFirst({
    where: { developerProjectId: projectId, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ success: true, reused: true, paymentRequest: existing });
  }

  const messages = Math.floor(amount / OTP_PRICE_EGP);
  const request = await prisma.paymentRequest.create({
    data: {
      developerUserId: session.id,
      developerProjectId: projectId,
      type: "developer_topup",
      productName: `شحن رصيد — مشروع ${project.name} — ${amount}ج (≈ ${messages} رسالة)`,
      amount,
      currency: "EGP",
      paymentMethod: paymentMethod ?? null,
      status: "PENDING",
    },
  });

  // 🔔 إشعار الأدمن بفاتورة شحن جديدة — fire-and-forget
  void (async () => {
    try {
      const dev = await prisma.developerUser.findUnique({
        where: { id: session.id },
        select: { firstName: true, lastName: true, email: true },
      });
      const devName = dev ? `${dev.firstName} ${dev.lastName}`.trim() : session.email;
      const { notifyAdminNewPaymentRequest } = await import("@/lib/notifications");
      await notifyAdminNewPaymentRequest({
        payerName: devName || session.email,
        payerEmail: dev?.email ?? session.email,
        productName: request.productName,
        amount: request.amount,
        currency: request.currency,
        isDeveloper: true,
        projectName: project.name,
        paymentRequestId: request.id,
      });
    } catch (err) {
      console.error("[DevBilling] Admin notify failed:", err);
    }
  })();

  return NextResponse.json({ success: true, reused: false, paymentRequest: request });
}
