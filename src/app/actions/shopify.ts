"use server";

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { getShopifyStore } from "@/lib/shopify";

/**
 * Server action to initiate Shopify OAuth flow
 */
export async function initiateShopifyConnection(shop: string) {
  try {
    // Verify user is authenticated
    const session = await getServerSession();

    if (!session?.user?.email) {
      return {
        success: false,
        error: "غير مصرح - يجب تسجيل الدخول أولاً",
      };
    }

    // Validate shop format
    const normalizedShop = shop.includes("myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    if (!normalizedShop.match(/^[a-zA-Z0-9-]+\.myshopify\.com$/)) {
      return {
        success: false,
        error: "صيغة رابط المتجر غير صحيحة",
      };
    }

    // Make request to install endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/shopify/install`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop: normalizedShop }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.error || "فشل بدء عملية الربط",
      };
    }

    const data = await response.json();

    return {
      success: true,
      authUrl: data.authUrl,
      shop: data.shop,
    };
  } catch (error) {
    console.error("[Shopify Action] Error:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء بدء عملية الربط",
    };
  }
}

/**
 * Server action to get Shopify store status
 */
export async function getShopifyStatus() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return {
        connected: false,
        store: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return {
        connected: false,
        store: null,
      };
    }

    const store = await getShopifyStore(user.id);

    return {
      connected: !!store,
      store: store
        ? {
            shop: store.shop,
            createdAt: store.createdAt,
          }
        : null,
    };
  } catch (error) {
    console.error("[Shopify Status Action] Error:", error);
    return {
      connected: false,
      store: null,
    };
  }
}

/**
 * Server action to disconnect Shopify store
 */
export async function disconnectShopifyStore() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return {
        success: false,
        error: "غير مصرح",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return {
        success: false,
        error: "المستخدم غير موجود",
      };
    }

    await prisma.shopifyStore.delete({
      where: { userId: user.id },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Shopify Disconnect Action] Error:", error);
    return {
      success: false,
      error: "فشل قطع الاتصال",
    };
  }
}
