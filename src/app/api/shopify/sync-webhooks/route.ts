// src/app/api/shopify/sync-webhooks/route.ts
// إعادة تسجيل كل الـ webhooks للمتاجر المربوطة (للمتاجر الموجودة)
import { NextResponse }              from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";
import { registerAllWebhooks }       from "@/app/api/shopify/install/route";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    const store = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: { shop: true, accessToken: true },
    });

    if (!store)
      return NextResponse.json({ error: "لا يوجد متجر Shopify مربوط" }, { status: 404 });

    if (!store.accessToken)
      return NextResponse.json(
        { error: "لا يوجد Access Token محفوظ — قم بتعديل المتجر وأضف الـ Token أولاً" },
        { status: 400 }
      );

    const webhookUrl = generateShopifyWebhookUrl(userId);
    const result     = await registerAllWebhooks(store.shop, store.accessToken, webhookUrl);

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