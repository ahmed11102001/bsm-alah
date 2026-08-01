// src/lib/product-sync.ts
import prisma from "@/lib/prisma";
import { ProductSource } from "@prisma/client";
import { verifyShopifyProductScope } from "@/lib/shopify-api";

export const MAX_PRODUCTS_PER_SYNC = 5000;

export interface SyncResult {
  source: ProductSource;
  synced: number;
  errors: number;
  deactivated: number;
  errorMessage?: string;
}

export function buildSearchText(product: {
  name: string;
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
}): string {
  const parts = [
    product.name || "",
    product.description || "",
    (product.tags || []).join(" "),
    product.category || "",
  ];
  return parts.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
}

// ── Shopify Product Sync ─────────────────────────────────────────────────────
export async function syncShopifyProducts(
  userId: string,
  shop: string,
  accessToken: string
): Promise<SyncResult> {
  const log = await prisma.productSyncLog.create({
    data: {
      userId,
      source: ProductSource.shopify,
      status: "in_progress",
    },
  });

  try {
    // 1. Scope check
    const scopeCheck = await verifyShopifyProductScope(shop, accessToken);
    if (!scopeCheck.hasProductScope) {
      const errMsg = `Shopify app lacks 'read_products' scope. Current scopes: ${scopeCheck.currentScopes.join(", ") || "none"}`;
      await prisma.productSyncLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: errMsg,
          completedAt: new Date(),
        },
      });
      return { source: ProductSource.shopify, synced: 0, errors: 1, deactivated: 0, errorMessage: errMsg };
    }

    let pageUrl: string | null = `https://${shop}/admin/api/2024-01/products.json?limit=250`;
    const fetchedIds = new Set<string>();
    let totalSynced = 0;
    let errorsCount = 0;
    const syncTime = new Date();

    while (pageUrl && fetchedIds.size < MAX_PRODUCTS_PER_SYNC) {
      const res: Response = await fetch(pageUrl, {
        headers: { "X-Shopify-Access-Token": accessToken },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        throw new Error(`Shopify API responded with status ${res.status}`);
      }

      const data = await res.json();
      const shopifyProducts: any[] = data.products || [];

      for (const p of shopifyProducts) {
        if (fetchedIds.size >= MAX_PRODUCTS_PER_SYNC) break;
        const externalId = String(p.id);
        fetchedIds.add(externalId);

        const firstVariant = p.variants?.[0];
        const price = firstVariant?.price != null ? parseFloat(firstVariant.price) : null;
        const compareAtPrice = firstVariant?.compare_at_price != null ? parseFloat(firstVariant.compare_at_price) : null;
        const stock = p.variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0) ?? null;
        const images: string[] = (p.images || []).map((img: any) => img.src).filter(Boolean);
        const tags: string[] = typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : (Array.isArray(p.tags) ? p.tags : []);
        const category = p.product_type || null;
        const description = p.body_html ? p.body_html.replace(/<[^>]*>?/gm, "").trim() : null;
        const handleUrl = p.handle ? `https://${shop}/products/${p.handle}` : null;
        const isActive = p.status ? p.status === "active" : true;

        const searchText = buildSearchText({ name: p.title, description, tags, category });

        try {
          await prisma.product.upsert({
            where: {
              source_externalId_userId: {
                source: ProductSource.shopify,
                externalId,
                userId,
              },
            },
            update: {
              name: p.title,
              description,
              price,
              compareAtPrice,
              currency: "EGP",
              images,
              variants: p.variants ? (p.variants as any) : undefined,
              stock,
              url: handleUrl,
              category,
              tags,
              isActive,
              searchText,
              lastSyncedAt: syncTime,
            },
            create: {
              userId,
              source: ProductSource.shopify,
              externalId,
              name: p.title,
              description,
              price,
              compareAtPrice,
              currency: "EGP",
              images,
              variants: p.variants ? (p.variants as any) : undefined,
              stock,
              url: handleUrl,
              category,
              tags,
              isActive,
              searchText,
              lastSyncedAt: syncTime,
            },
          });
          totalSynced++;
        } catch (e) {
          console.error(`[ProductSync/Shopify] Failed to upsert product ${externalId}`, e);
          errorsCount++;
        }
      }

      // Pagination check (Link header)
      const linkHeader = res.headers.get("Link") || res.headers.get("link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        pageUrl = match ? match[1] : null;
      } else {
        pageUrl = null;
      }
    }

    // Deactivate missing products
    const fetchedArray = Array.from(fetchedIds);
    const deactivatedResult = await prisma.product.updateMany({
      where: {
        userId,
        source: ProductSource.shopify,
        isActive: true,
        externalId: { notIn: fetchedArray },
      },
      data: { isActive: false },
    });

    await prisma.productSyncLog.update({
      where: { id: log.id },
      data: {
        status: errorsCount > 0 ? "partial" : "success",
        productsSynced: totalSynced,
        errorsCount,
        completedAt: new Date(),
      },
    });

    return {
      source: ProductSource.shopify,
      synced: totalSynced,
      errors: errorsCount,
      deactivated: deactivatedResult.count,
    };
  } catch (err: any) {
    console.error("[ProductSync/Shopify] Sync error:", err);
    await prisma.productSyncLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorMessage: err.message || "Unknown sync error",
        completedAt: new Date(),
      },
    });
    return {
      source: ProductSource.shopify,
      synced: 0,
      errors: 1,
      deactivated: 0,
      errorMessage: err.message,
    };
  }
}

// ── EasyOrders Product Sync ──────────────────────────────────────────────────
export async function syncEasyOrdersProducts(
  userId: string,
  apiKey: string
): Promise<SyncResult> {
  const log = await prisma.productSyncLog.create({
    data: {
      userId,
      source: ProductSource.easyorders,
      status: "in_progress",
    },
  });

  try {
    const res = await fetch("https://api.easy-orders.net/api/v1/external-apps/products", {
      headers: {
        "Api-Key": apiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`EasyOrders API responded with status ${res.status}`);
    }

    const data = await res.json();
    const rawProducts: any[] = Array.isArray(data) ? data : (data.data || data.products || []);

    const fetchedIds = new Set<string>();
    let totalSynced = 0;
    let errorsCount = 0;
    const syncTime = new Date();

    for (const p of rawProducts) {
      if (fetchedIds.size >= MAX_PRODUCTS_PER_SYNC) break;
      const externalId = String(p.id || p._id || p.code);
      if (!externalId) continue;
      fetchedIds.add(externalId);

      const name = p.name || p.title || "بدون اسم";
      const description = p.description ? p.description.replace(/<[^>]*>?/gm, "").trim() : null;
      const price = p.price != null ? parseFloat(p.price) : null;
      const compareAtPrice = p.compare_at_price != null ? parseFloat(p.compare_at_price) : null;
      const currency = p.currency || "EGP";
      const images: string[] = Array.isArray(p.images) ? p.images.map((img: any) => typeof img === "string" ? img : img.url || img.src).filter(Boolean) : (p.image ? [p.image] : []);
      const stock = p.quantity != null ? parseInt(p.quantity, 10) : (p.stock != null ? parseInt(p.stock, 10) : null);
      const category = p.category?.name || p.category || null;
      const isActive = p.status ? (p.status === "active" || p.status === 1 || p.status === true) : true;
      const searchText = buildSearchText({ name, description, category });

      try {
        await prisma.product.upsert({
          where: {
            source_externalId_userId: {
              source: ProductSource.easyorders,
              externalId,
              userId,
            },
          },
          update: {
            name,
            description,
            price,
            compareAtPrice,
            currency,
            images,
            stock,
            category,
            isActive,
            searchText,
            lastSyncedAt: syncTime,
          },
          create: {
            userId,
            source: ProductSource.easyorders,
            externalId,
            name,
            description,
            price,
            compareAtPrice,
            currency,
            images,
            stock,
            category,
            isActive,
            searchText,
            lastSyncedAt: syncTime,
          },
        });
        totalSynced++;
      } catch (e) {
        console.error(`[ProductSync/EasyOrders] Failed to upsert product ${externalId}`, e);
        errorsCount++;
      }
    }

    const fetchedArray = Array.from(fetchedIds);
    const deactivatedResult = await prisma.product.updateMany({
      where: {
        userId,
        source: ProductSource.easyorders,
        isActive: true,
        externalId: { notIn: fetchedArray },
      },
      data: { isActive: false },
    });

    await prisma.productSyncLog.update({
      where: { id: log.id },
      data: {
        status: errorsCount > 0 ? "partial" : "success",
        productsSynced: totalSynced,
        errorsCount,
        completedAt: new Date(),
      },
    });

    return {
      source: ProductSource.easyorders,
      synced: totalSynced,
      errors: errorsCount,
      deactivated: deactivatedResult.count,
    };
  } catch (err: any) {
    console.error("[ProductSync/EasyOrders] Sync error:", err);
    await prisma.productSyncLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorMessage: err.message || "Unknown sync error",
        completedAt: new Date(),
      },
    });
    return {
      source: ProductSource.easyorders,
      synced: 0,
      errors: 1,
      deactivated: 0,
      errorMessage: err.message,
    };
  }
}

// ── Manual Product Add/Edit ──────────────────────────────────────────────────
export interface ManualProductInput {
  id?: string;
  name: string;
  description?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  images?: string[];
  stock?: number | null;
  category?: string | null;
  tags?: string[];
  url?: string | null;
}

export async function upsertManualProduct(
  userId: string,
  input: ManualProductInput
) {
  const externalId = input.id || `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const searchText = buildSearchText({
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
  });

  return prisma.product.upsert({
    where: {
      source_externalId_userId: {
        source: ProductSource.manual,
        externalId,
        userId,
      },
    },
    update: {
      name: input.name,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      currency: input.currency || "EGP",
      images: input.images || [],
      stock: input.stock,
      category: input.category,
      tags: input.tags || [],
      url: input.url,
      isActive: true,
      searchText,
      lastSyncedAt: new Date(),
    },
    create: {
      userId,
      source: ProductSource.manual,
      externalId,
      name: input.name,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      currency: input.currency || "EGP",
      images: input.images || [],
      stock: input.stock,
      category: input.category,
      tags: input.tags || [],
      url: input.url,
      isActive: true,
      searchText,
      lastSyncedAt: new Date(),
    },
  });
}
