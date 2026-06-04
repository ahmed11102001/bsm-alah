// src/app/api/coupons/use/route.ts
// ─── Coupon Usage — Requires auth ────────────────────────────────────────────
// يزود الـ usedCount بعد الدفع الناجح (atomic increment مع guard)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { z }                         from "zod";

const Schema = z.object({ code: z.string().trim().min(1).toUpperCase() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body   = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const coupon = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });

  if (!coupon || !coupon.active || coupon.usedCount >= coupon.maxUses)
    return NextResponse.json({ error: "كوبون غير صالح" }, { status: 400 });

  await prisma.coupon.update({
    where: { code: parsed.data.code },
    data:  { usedCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true });
}