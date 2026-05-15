"use server";

import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import prisma               from "@/lib/prisma";

/**
 * Server action to get Shopify store status
 */
export async function getShopifyStatus() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { connected: false, store: null };

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!user) return { connected: false, store: null };

    const userId = user.parentId ?? user.id;

    const store = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: { shop: true, createdAt: true, isActive: true },
    });

    return {
      connected: !!store,
      store: store ? { shop: store.shop, createdAt: store.createdAt } : null,
    };
  } catch (error) {
    console.error("[Shopify Status Action] Error:", error);
    return { connected: false, store: null };
  }
}

/**
 * Server action to disconnect Shopify store
 */
export async function disconnectShopifyStore() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "غير مصرح" };

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!user) return { success: false, error: "المستخدم غير موجود" };

    const userId = user.parentId ?? user.id;
    await prisma.shopifyStore.deleteMany({ where: { userId } });

    return { success: true };
  } catch (error) {
    console.error("[Shopify Disconnect Action] Error:", error);
    return { success: false, error: "فشل قطع الاتصال" };
  }
}

/**
 * initiateShopifyConnection — kept for compatibility (webhook-only now, no OAuth)
 * @deprecated استخدم /api/shopify/install مباشرة
 */
export async function initiateShopifyConnection(storeName: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "غير مصرح - يجب تسجيل الدخول أولاً" };
    }

    if (!storeName?.trim()) {
      return { success: false, error: "اسم المتجر مطلوب" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/shopify/install`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storeName: storeName.trim() }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error ?? "فشل بدء عملية الربط" };
    }

    return { success: true, webhookUrl: data.webhookUrl, storeName: data.storeName };
  } catch (error) {
    console.error("[Shopify Action] Error:", error);
    return { success: false, error: "حدث خطأ أثناء بدء عملية الربط" };
  }
}