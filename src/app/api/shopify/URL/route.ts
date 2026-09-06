// src/app/api/shopify/URL/route.ts
import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import prisma               from "@/lib/prisma";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";
import { getShopifyAuthMethod } from "@/lib/shopify-auth";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;
    const url    = generateShopifyWebhookUrl(userId);
    // ── Plan guard: store integration — pro فأعلى ──
    const sgGuard = await checkFeature(userId, "storeIntegration");
    const sgBlocked = guardResponse(sgGuard);
    if (sgBlocked) return sgBlocked;


    const store = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: { shop: true, createdAt: true, accessToken: true, clientId: true, clientSecret: true },
    }).catch(() => null);

    return NextResponse.json({
      url,
      connected:   !!store,
      storeName:   store?.shop  ?? null,
      connectedAt: store?.createdAt ?? null,
      authMethod:  store ? getShopifyAuthMethod(store) : "none",
    });
  } catch (e) {
    console.error("[Shopify URL]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}