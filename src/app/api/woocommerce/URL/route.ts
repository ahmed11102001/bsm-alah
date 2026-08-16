// src/app/api/woocommerce/URL/route.ts
import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { createHmac }       from "crypto";
import prisma               from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export function generateWooWebhookUrl(userId: string): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://aiwni.com";
  const token = createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(`woo:${userId}`)
    .digest("hex")
    .slice(0, 32);
  return `${base}/api/woocommerce/webhooks?uid=${userId}&token=${token}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

  if (denied) return denied;

  const dbUser = await prisma.user.findUnique({
    where:  { email: session!.user.email },
    select: { id: true, parentId: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = dbUser.parentId ?? dbUser.id;

  const store = await prisma.wooCommerceStore.findUnique({
    where:  { userId },
    select: { storeName: true, createdAt: true, totalSynced: true, lastSyncAt: true },
  }).catch(() => null);

  return NextResponse.json({
    url:         generateWooWebhookUrl(userId),
    connected:   !!store,
    storeName:   store?.storeName   ?? null,
    totalSynced: store?.totalSynced ?? 0,
    lastSyncAt:  store?.lastSyncAt  ?? null,
  });
}