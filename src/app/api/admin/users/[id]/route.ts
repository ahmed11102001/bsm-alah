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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await guardSuper())
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const { id } = await params;
  const { plan } = await req.json();
  if (!plan)
    return NextResponse.json({ error: "plan مطلوب" }, { status: 400 });

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