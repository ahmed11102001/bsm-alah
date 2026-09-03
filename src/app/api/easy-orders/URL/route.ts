// src/app/api/easy-orders/URL/route.ts
// ─── إرجاع Webhook URL الخاص بالمستخدم ──────────────────────────────────────
//
// المصادقة الحقيقية على هذا الرابط تتم عبر هيدر "secret" اللي EasyOrders
// بترسله مع كل نداء Webhook (راجع src/app/api/easy-orders/webhooks/route.ts).
// الـ "uid" هنا للـ routing بس — مفيش داعي لأي token إضافي زي القديم.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { email: session!.user.email! },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Plan guard: store integration — pro فأعلى ──
  const eoGuard = await checkFeature(user.id, "storeIntegration");
  const eoBlocked = guardResponse(eoGuard);
  if (eoBlocked) return eoBlocked;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://aiwni.com";

  // المسار الصحيح: /api/easy-orders/webhooks
  const url = `${base}/api/easy-orders/webhooks?uid=${user.id}`;

  return NextResponse.json({ url });
}
