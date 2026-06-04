// src/app/api/coupons/validate/route.ts
// ─── Coupon Validation — Public endpoint ─────────────────────────────────────
// يتحقق إن الكوبون صالح للباقة المطلوبة ويرجع قيمة الخصم

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  code:     z.string().trim().min(1).toUpperCase(),
  /** الباقة المطلوب التحقق منها — undefined لو token/mcp purchase */
  planSlug: z.enum(["starter", "pro", "enterprise"]).optional(),
});

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success)
    return NextResponse.json({ valid: false, error: "بيانات غير صحيحة" }, { status: 400 });

  const { code, planSlug } = parsed.data;

  const coupon = await prisma.coupon.findUnique({ where: { code } });

  // ── checks ────────────────────────────────────────────────────────────────
  if (!coupon || !coupon.active)
    return NextResponse.json({ valid: false, error: "كود الخصم غير صحيح أو منتهي" });

  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return NextResponse.json({ valid: false, error: "كود الخصم منتهي الصلاحية" });

  if (coupon.usedCount >= coupon.maxUses)
    return NextResponse.json({ valid: false, error: "تم استنفاد جميع استخدامات الكود" });

  // ── plan restriction ──────────────────────────────────────────────────────
  if (coupon.forPlan && planSlug && coupon.forPlan !== planSlug) {
    const planNames: Record<string, string> = {
      starter:    "Starter",
      pro:        "Pro",
      enterprise: "Enterprise",
    };
    return NextResponse.json({
      valid: false,
      error: `هذا الكود مخصص لباقة ${planNames[coupon.forPlan] ?? coupon.forPlan} فقط`,
    });
  }

  return NextResponse.json({
    valid:         true,
    code:          coupon.code,
    discountType:  coupon.discountType,   // "percent" | "fixed"
    discountValue: coupon.discountValue,  // e.g. 20 = 20% or 50 = 50 EGP
    forPlan:       coupon.forPlan,        // null = all plans
  });
}