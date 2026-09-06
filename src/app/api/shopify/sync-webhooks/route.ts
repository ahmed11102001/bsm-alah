// src/app/api/shopify/sync-webhooks/route.ts
// إعادة تسجيل كل الـ webhooks للمتاجر المربوطة (للمتاجر الموجودة)
import { NextResponse }              from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";
import { registerAllWebhooks }       from "@/app/api/shopify/install/route";
import {
  SHOPIFY_CREDENTIALS_SELECT,
  getValidShopifyAccessToken,
} from "@/lib/shopify-auth";
import { requirePermission } from "@/lib/permissions";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    const store = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: SHOPIFY_CREDENTIALS_SELECT,
    });

    if (!store)
      return NextResponse.json({ error: "لا يوجد متجر Shopify مربوط" }, { status: 404 });

    const webhookUrl = generateShopifyWebhookUrl(userId);
    const token = await getValidShopifyAccessToken(store);
    if (!token)
      return NextResponse.json(
        { error: "لا توجد بيانات اعتماد صالحة — قم بتعديل المتجر وأضف Access Token أو Client ID/Secret أولاً" },
        { status: 400 }
      );
    const result     = await registerAllWebhooks(store.shop, token, webhookUrl);

    return NextResponse.json({
      success:    result.failed.length === 0,
      registered: result.registered,
      failed:     result.failed,
      message:    result.failed.length === 0
        ? `✅ تم تسجيل ${result.registered.length} webhook بنجاح`
        : `⚠️ تم تسجيل ${result.registered.length}، فشل ${result.failed.length}: ${result.failed.join(", ")}`,
    });

  } catch (error) {
    console.error("[Sync Webhooks] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
