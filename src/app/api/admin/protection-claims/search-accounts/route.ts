// src/app/api/admin/protection-claims/search-accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireSuper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuper) return null;
  return session;
}

// ─── GET /api/admin/protection-claims/search-accounts ─────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() || "";

  if (!query) {
    return NextResponse.json({ accounts: [] });
  }

  const accounts = await prisma.whatsAppAccount.findMany({
    where: {
      OR: [
        { id: { contains: query, mode: "insensitive" } },
        { phoneNumberId: { contains: query, mode: "insensitive" } },
        { wabaId: { contains: query, mode: "insensitive" } },
        {
          user: {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { brandName: { contains: query, mode: "insensitive" } },
            ],
          },
        },
      ],
    },
    take: 15,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          brandName: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ accounts });
}
