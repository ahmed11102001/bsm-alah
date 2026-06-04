// src/app/api/admin/coupons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import crypto                        from "crypto";
import { AdminCreateCouponSchema, parseInput } from "@/lib/schemas";
import { z } from "zod";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// كود عشوائي: مثلاً SAVE-A3F9K
function generateCode(prefix = "SAVE"): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

// GET: كل الكوبونات
export async function GET() {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
}

// POST: إنشاء كوبون
export async function POST(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const parsed = parseInput(AdminCreateCouponSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { prefix, discountType, discountValue, maxUses, expiresAt, forPlan } = parsed.data;

  // تأكد إن الكود مش موجود قبل كده (نجرب 3 مرات)
  let code = "";
  for (let i = 0; i < 3; i++) {
    const candidate = generateCode(prefix);
    const exists    = await prisma.coupon.findUnique({ where: { code: candidate } });
    if (!exists) { code = candidate; break; }
  }
  if (!code)
    return NextResponse.json({ error: "حاول مرة أخرى" }, { status: 500 });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discountType,
      discountValue,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      forPlan:   forPlan ?? null,
      active:    true,
    },
  });

  return NextResponse.json({ success: true, coupon }, { status: 201 });
}

// DELETE: تعطيل كوبون
const DeleteCouponSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const parsed = parseInput(DeleteCouponSchema, await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await prisma.coupon.update({
    where: { id: parsed.data.id },
    data:  { active: false },
  });

  return NextResponse.json({ success: true });
}