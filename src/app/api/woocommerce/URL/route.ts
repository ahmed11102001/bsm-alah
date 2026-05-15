// src/app/api/woocommerce/URL/route.ts
import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import prisma               from "@/lib/prisma";
import { generateWooWebhookUrl } from "@/app/api/woocommerce/webhooks/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, parentId: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = dbUser.parentId ?? dbUser.id;
  const url    = generateWooWebhookUrl(userId);

  // جيب بيانات المتجر لو موجود
  const store = await prisma.wooCommerceStore.findUnique({
    where:  { userId },
    select: { storeName: true, isActive: true, totalSynced: true, lastSyncAt: true },
  });

  return NextResponse.json({
    url,
    connected:   !!store,
    storeName:   store?.storeName,
    isActive:    store?.isActive,
    totalSynced: store?.totalSynced ?? 0,
    lastSyncAt:  store?.lastSyncAt ?? null,
  });
}