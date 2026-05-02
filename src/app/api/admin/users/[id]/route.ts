import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function guardSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── PATCH /api/admin/users/[id] — تعديل الـ plan ────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { plan } = await req.json();
  if (!plan)
    return NextResponse.json({ error: "plan مطلوب" }, { status: 400 });

  // upsert الـ subscription — لو مفيش subscription للـ user ده هيعملها
  await prisma.subscription.upsert({
    where:  { userId: params.id },
    update: { plan },
    create: {
      userId:                params.id,
      plan,
      status:                "active",
      periodResetAt:         new Date(),
      campaignsUsedThisMonth: 0,
    },
  });

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/admin/users/[id] — حذف يوزر ─────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}