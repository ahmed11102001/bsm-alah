// src/inngest/product-sync-functions.ts
import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { syncShopifyProducts, syncEasyOrdersProducts, syncWooCommerceProducts } from "@/lib/product-sync";
import { decryptToken, isEncrypted } from "@/lib/crypto";

const plainCredential = (value: string) => isEncrypted(value) ? decryptToken(value) : value;

// ── 1. Cron Job: Product Sync كل 6 ساعات ────────────────────────────────────
export const productSyncCron = inngest.createFunction(
  {
    id: "product-sync-cron",
    retries: 1,
    triggers: [{ cron: "0 */6 * * *" }], // كل 6 ساعات
  },
  async ({ step }: { step: any }) => {
    // Step 1: Shopify Sync
    const shopifyResults = await step.run("sync-all-shopify-stores", async () => {
      const stores = await prisma.shopifyStore.findMany({
        where: { isActive: true, accessToken: { not: null } },
        select: { userId: true, shop: true, accessToken: true },
      });

      const results = [];
      for (const store of stores) {
        if (!store.accessToken) continue;
        try {
          const res = await syncShopifyProducts(store.userId, store.shop, plainCredential(store.accessToken));
          results.push({ userId: store.userId, shop: store.shop, ...res });
        } catch (err: any) {
          console.error(`[Inngest/Cron] Shopify sync failed for ${store.shop}:`, err);
        }
      }
      return results;
    });

    // Step 2: EasyOrders Sync
    const easyOrdersResults = await step.run("sync-all-easyorders-stores", async () => {
      const stores = await prisma.easyOrdersStore.findMany({
        where: { isActive: true, apiKey: { not: "" } },
        select: { userId: true, apiKey: true, storeName: true },
      });

      const results = [];
      for (const store of stores) {
        try {
          const res = await syncEasyOrdersProducts(store.userId, plainCredential(store.apiKey));
          results.push({ userId: store.userId, storeName: store.storeName, ...res });
        } catch (err: any) {
          console.error(`[Inngest/Cron] EasyOrders sync failed for ${store.storeName}:`, err);
        }
      }
      return results;
    });

    const woocommerceResults = await step.run("sync-all-woocommerce-stores", async () => {
      const stores = await prisma.wooCommerceStore.findMany({ where: { isActive: true, isConnected: true, consumerKey: { not: null }, consumerSecret: { not: null } }, select: { userId: true, storeUrl: true, consumerKey: true, consumerSecret: true, storeName: true } });
      const results = [];
      for (const store of stores) {
        if (!store.storeUrl || !store.consumerKey || !store.consumerSecret) continue;
        try { results.push({ userId: store.userId, storeName: store.storeName, ...await syncWooCommerceProducts(store.userId, store.storeUrl, plainCredential(store.consumerKey), plainCredential(store.consumerSecret)) }); }
        catch (err) { console.error(`[Inngest/Cron] WooCommerce sync failed for ${store.storeName}:`, err); }
      }
      return results;
    });
    return { success: true, shopifyResults, easyOrdersResults, woocommerceResults };
  }
);

// ── 2. On-demand Product Sync (طُلب يدويًا من الـ Dashboard) ─────────────────
export const productSyncOnDemand = inngest.createFunction(
  {
    id: "product-sync-on-demand",
    retries: 1,
    triggers: [{ event: "product/sync.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, source = "all" } = event.data as { userId: string; source?: "shopify" | "easyorders" | "woocommerce" | "all" };

    if (!userId) return { success: false, error: "userId is required" };

    const results: Record<string, any> = {};

    if (source === "shopify" || source === "all") {
      results.shopify = await step.run("sync-user-shopify", async () => {
        const store = await prisma.shopifyStore.findUnique({
          where: { userId },
          select: { shop: true, accessToken: true, isActive: true },
        });

        if (!store || !store.isActive || !store.accessToken) {
          return { skipped: true, reason: "No active Shopify store connected" };
        }

        return syncShopifyProducts(userId, store.shop, plainCredential(store.accessToken));
      });
    }

    if (source === "easyorders" || source === "all") {
      results.easyorders = await step.run("sync-user-easyorders", async () => {
        const store = await prisma.easyOrdersStore.findUnique({
          where: { userId },
          select: { apiKey: true, isActive: true },
        });

        if (!store || !store.isActive || !store.apiKey) {
          return { skipped: true, reason: "No active EasyOrders store connected" };
        }

        return syncEasyOrdersProducts(userId, plainCredential(store.apiKey));
      });
    }

    if (source === "woocommerce" || source === "all") {
      results.woocommerce = await step.run("sync-user-woocommerce", async () => {
        const store = await prisma.wooCommerceStore.findUnique({ where: { userId }, select: { storeUrl: true, consumerKey: true, consumerSecret: true, isActive: true, isConnected: true } });
        if (!store || !store.isActive || !store.isConnected || !store.storeUrl || !store.consumerKey || !store.consumerSecret) return { skipped: true, reason: "No active WooCommerce store connected" };
        return syncWooCommerceProducts(userId, store.storeUrl, plainCredential(store.consumerKey), plainCredential(store.consumerSecret));
      });
    }

    return { success: true, userId, results };
  }
);
