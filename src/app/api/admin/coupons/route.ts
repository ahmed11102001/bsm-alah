// src/app/api/admin/coupons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import crypto                        from "crypto";

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

// ── GET: كل الكوبونات ─────────────────────────────────────────────────────────
export async function GET() {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
}

// ── POST: إنشاء كوبون ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const {
    prefix       = "SAVE",
    discountType  = "percent",
    discountValue,
    maxUses      = 1,
    expiresAt,
  } = await req.json();

  if (!discountValue || discountValue <= 0)
    return NextResponse.json({ error: "قيمة الخصم مطلوبة" }, { status: 400 });

  if (discountType === "percent" && discountValue > 100)
    return NextResponse.json({ error: "نسبة الخصم لا تتجاوز 100%" }, { status: 400 });

  // تأكد إن الكود مش موجود قبل كده (نجرب 3 مرات)
  let code = "";
  for (let i = 0; i < 3; i++) {
    const candidate = generateCode(prefix.toUpperCase().slice(0, 8));
    const exists    = await prisma.coupon.findUnique({ where: { code: candidate } });
    if (!exists) { code = candidate; break; }
  }
  if (!code)
    return NextResponse.json({ error: "حاول مرة أخرى" }, { status: 500 });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discountType,
      discountValue: Number(discountValue),
      maxUses:       Number(maxUses),
      expiresAt:     expiresAt ? new Date(expiresAt) : null,
      active:        true,
    },
  });

  return NextResponse.json({ success: true, coupon }, { status: 201 });
}

// ── DELETE: حذف أو تعطيل كوبون ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!await guardSuper())
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  await prisma.coupon.update({
    where: { id },
    data:  { active: false },
  });

  return NextResponse.json({ success: true });
}