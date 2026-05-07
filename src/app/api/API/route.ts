// src/app/api/API/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

// GET /api/API — يجيب كل البيانات اللي صفحة API محتاجاها
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const ownerId = (session.user as any).parentId ?? userId;

  // Guard: API Access
  const check = await checkFeature(userId, "apiAccess");
  const block = guardResponse(check);
  if (block) return block;

  const [user, whatsappAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { apiKey: true },
    }),
    prisma.whatsAppAccount.findUnique({
      where: { userId: ownerId },
      select: { accessToken: true, phoneNumberId: true, wabaId: true },
    }),
  ]);

  return NextResponse.json({
    apiKey: user?.apiKey ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    whatsapp: whatsappAccount ?? null,
  });
}