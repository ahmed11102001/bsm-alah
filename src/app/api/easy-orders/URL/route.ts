// src/app/api/easy-orders/URL/route.ts
// ─── إرجاع Webhook URL الخاص بالمستخدم ──────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";

function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { email: session.user?.email! },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Plan guard: store integration — pro فأعلى ──
  const eoGuard = await checkFeature(user.id, "storeIntegration");
  const eoBlocked = guardResponse(eoGuard);
  if (eoBlocked) return eoBlocked;

  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(user.id);

  // المسار الصحيح: /api/easy-orders/webhooks
  const url = `${base}/api/easy-orders/webhooks?uid=${user.id}&token=${token}`;

  return NextResponse.json({ url });
}