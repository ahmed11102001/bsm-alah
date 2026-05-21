// src/app/api/ai-credits/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AI_CREDIT_PACKAGES, type AiCreditPackageId } from "@/lib/plans";

function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const ownerId = resolveOwnerId(session);

  const sub = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: { plan: true },
  });

  if (!sub || sub.plan !== "enterprise")
    return NextResponse.json(
      { error: "هذه الميزة متاحة لمشتركي Enterprise فقط" },
      { status: 403 }
    );

  const body = await req.json().catch(() => ({}));
  const packageId = body.packageId as AiCreditPackageId | undefined;

  const pkg = AI_CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg)
    return NextResponse.json(
      { error: "حزمة غير صالحة — اختر 500k أو 1m" },
      { status: 400 }
    );

  // TODO production: أنشئ Stripe checkout session وارجع { checkoutUrl }
  // const checkoutUrl = await createStripeCheckout(pkg, ownerId);
  // return NextResponse.json({ checkoutUrl });

  // Sandbox: نضيف مباشرة
  await prisma.subscription.update({
    where: { userId: ownerId },
    data:  { aiTokensBonusBalance: { increment: pkg.tokens } },
  });

  return NextResponse.json({
    success: true,
    added:   pkg.tokens,
    message: `تمت إضافة ${pkg.tokens.toLocaleString("ar-EG")} كريديت بنجاح`,
  });
}

export async function GET() {
  return NextResponse.json({ packages: AI_CREDIT_PACKAGES });
}
