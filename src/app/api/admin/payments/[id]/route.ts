// src/app/api/admin/payments/[id]/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  PATCH /api/admin/payments/[id]
//  Body: { action: "approve" | "reject", reason?: string }
//
//  - approve → status = APPROVED + تفعيل الباقة/الإضافة فعليًا في الـDB
//    (src/lib/payment-requests.ts هو المكان الوحيد اللي بيعمل التفعيل).
//  - reject  → status = REJECTED، مفيش أي تفعيل.
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  approvePaymentRequest,
  rejectPaymentRequest,
  ManualPaymentError,
} from "@/lib/payment-requests";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuper();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as "approve" | "reject" | undefined;
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : undefined;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action غير صالح" }, { status: 400 });
  }

  try {
    const updated =
      action === "approve"
        ? await approvePaymentRequest(id, session.user.id)
        : await rejectPaymentRequest(id, session.user.id, reason);

    return NextResponse.json({ success: true, paymentRequest: updated });
  } catch (err) {
    if (err instanceof ManualPaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[AdminPayments] فشل تحديث طلب الدفع:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 });
  }
}
