import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── PATCH /api/admin/users/[id] — تعديل الـ plan أو isBetaUser flag ─────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  // لو الـ body جاي بـ isBetaUser بس → toggle الـ flag فقط
  if (typeof body.isBetaUser === "boolean" && !body.plan) {
    await prisma.subscription.upsert({
      where:  { userId: id },
      update: { isBetaUser: body.isBetaUser },
      create: {
        userId:                 id,
        plan:                   "free",
        status:                 "active",
        isBetaUser:             body.isBetaUser,
        periodResetAt:          new Date(),
        campaignsUsedThisMonth: 0,
      },
    });
    return NextResponse.json({ success: true });
  }

  // غير ذلك → تعديل الـ plan العادي
  const { plan } = body;
  if (!plan)
    return NextResponse.json({ error: "plan أو isBetaUser مطلوب" }, { status: 400 });

  await prisma.subscription.upsert({
    where:  { userId: id },
    update: { plan },
    create: {
      userId:                id,
      plan,
      status:                "active",
      periodResetAt:         new Date(),
      campaignsUsedThisMonth: 0,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}