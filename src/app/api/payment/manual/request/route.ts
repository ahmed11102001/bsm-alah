// src/app/api/payment/manual/request/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/payment/manual/request
//  بيسجّل Payment Request بحالة PENDING قبل ما المستخدم يفتح WhatsApp لإرسال
//  إثبات الدفع. ده الـflow الرسمي الحالي للدفع (Manual Payment) — مفيش أي
//  اتصال بـFawaterak هنا.
//
//  Body: {
//    type:              "subscription" | "token_package" | "mcp_addon"
//    planSlug?:          "starter" | "pro" | "enterprise"
//    cycle?:             "monthly" | "quarterly" | "annual"
//    packageId?:         "pack_500k" | "pack_1m" | "pack_2m" | "mcp_addon_unlimited"
//    paymentMethod?:     "instapay" | "etisalat"
//    useReferralCredit?: boolean
//  }
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  createManualPaymentRequest,
  ManualPaymentError,
  type ManualPaymentType,
} from "@/lib/payment-requests";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "BILLING_MANAGE");
  if (denied) return denied;

  const ownerId = resolveOwnerId(session);
  const body = await req.json().catch(() => ({}));

  const {
    type,
    planSlug = null,
    cycle = null,
    packageId = null,
    paymentMethod = null,
    useReferralCredit = true,
  } = body as {
    type: ManualPaymentType;
    planSlug?: string | null;
    cycle?: string | null;
    packageId?: string | null;
    paymentMethod?: "instapay" | "etisalat" | null;
    useReferralCredit?: boolean;
  };

  if (!type || !["subscription", "token_package", "mcp_addon"].includes(type)) {
    return NextResponse.json({ error: "يجب تحديد نوع العملية (type)" }, { status: 400 });
  }
  if (paymentMethod && !["instapay", "etisalat"].includes(paymentMethod)) {
    return NextResponse.json({ error: "طريقة دفع غير صالحة" }, { status: 400 });
  }

  try {
    const { request, reused } = await createManualPaymentRequest(ownerId, {
      type,
      planSlug,
      cycle,
      packageId,
      paymentMethod,
      useReferralCredit,
    });

    return NextResponse.json({
      success: true,
      reused,
      paymentRequest: {
        id: request.id,
        type: request.type,
        productName: request.productName,
        amount: request.amount,
        currency: request.currency,
        status: request.status,
      },
    });
  } catch (err) {
    if (err instanceof ManualPaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ManualPayment] فشل إنشاء طلب الدفع:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل طلب الدفع" }, { status: 500 });
  }
}
