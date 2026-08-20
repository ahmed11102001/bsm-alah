// src/app/api/admin/payments/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/payments — قائمة كل Payment Requests لتبويب "المدفوعات" في
//  لوحة الأدمن. حالة الدفع مصدرها الوحيد هو جدول PaymentRequest في الـDB.
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper || !session.user.id) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim() || "";

  const where: any = {};
  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [requests, counts] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.paymentRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countsByStatus: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const c of counts as any[]) {
    countsByStatus[c.status] = c._count._all;
  }

  return NextResponse.json({ requests, counts: countsByStatus });
}
