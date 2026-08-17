// src/lib/shopify-api.ts
// ─── Shopify Admin REST API helpers — نداءات بسيطة، بدون client كامل ─────────

const SHOPIFY_API_VERSION = "2024-01";

interface ShopifyVariantResponse {
    variant?: { id: number; product_id: number; image_id: number | null };
}

interface ShopifyProductResponse {
    product?: { id: number; image?: { src: string } | null };
}

interface ShopifyImageResponse {
    image?: { src: string };
}

// ─── جلب رابط صورة منتج/فاريانت من Shopify ──────────────────────────────────
// بيحاول أول حاجة يجيب صورة الـ variant نفسه (لو متحددة)، ولو مفيش
// بيرجع لصورة المنتج الرئيسية. بيرجع null لو فشل أي حاجة بدل ما يوقف الإرسال.
export async function getShopifyProductImageUrl(
    shop: string,
    accessToken: string,
    opts: { productId?: number | null; variantId?: number | null },
): Promise<string | null> {
    try {
        let productId = opts.productId ?? null;
        let variantImageId: number | null = null;

        // ── 1) لو عندنا variant_id، اجيب منه product_id + image_id (لو محددة) ──
        if (opts.variantId) {
            const res = await fetch(
                `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/variants/${opts.variantId}.json`,
                {
                    headers: { "X-Shopify-Access-Token": accessToken },
                    signal: AbortSignal.timeout(8_000),
                },
            );
            if (res.ok) {
                const data = (await res.json()) as ShopifyVariantResponse;
                productId = data.variant?.product_id ?? productId;
                variantImageId = data.variant?.image_id ?? null;
            } else {
                console.warn(`[ShopifyAPI] variant ${opts.variantId} fetch failed: ${res.status}`);
            }
        }

        if (!productId) return null;

        // ── 2) لو الـ variant له صورة مخصوصة، هاتها بالذات ──────────────────────
        if (variantImageId) {
            const res = await fetch(
                `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${variantImageId}.json`,
                {
                    headers: { "X-Shopify-Access-Token": accessToken },
                    signal: AbortSignal.timeout(8_000),
                },
            );
            if (res.ok) {
                const data = (await res.json()) as ShopifyImageResponse;
                if (data.image?.src) return data.image.src;
            }
        }

        // ── 3) Fallback: الصورة الرئيسية للمنتج ─────────────────────────────────
        const res = await fetch(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`,
            {
                headers: { "X-Shopify-Access-Token": accessToken },
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!res.ok) {
            console.warn(`[ShopifyAPI] product ${productId} fetch failed: ${res.status}`);
            return null;
        }
        const data = (await res.json()) as ShopifyProductResponse;
        return data.product?.image?.src ?? null;
    } catch (err) {
        console.error("[ShopifyAPI] getShopifyProductImageUrl error:", err);
        return null; // فشل السحب لا يوقف إرسال رسالة المتابعة — بيتبعت من غير صورة
    }
}

// ─── تأكيد الأوردر في شوبيفاي عن طريق إضافة Tag (شوبيفاي معندهاش "confirmed" status جاهزة) ──
interface ShopifyOrderTagsResponse {
    order?: { id: number; tags: string };
}

const WANI_CONFIRMED_TAG = "مؤكد واتساب";

export async function tagShopifyOrderConfirmed(
    shop: string,
    accessToken: string,
    shopifyOrderId: string | number,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const getRes = await fetch(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}.json?fields=id,tags`,
            {
                headers: { "X-Shopify-Access-Token": accessToken },
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!getRes.ok) {
            return { ok: false, error: `fetch order failed: HTTP ${getRes.status}` };
        }
        const data = (await getRes.json()) as ShopifyOrderTagsResponse;
        const existingTags = (data.order?.tags ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        if (existingTags.includes(WANI_CONFIRMED_TAG)) {
            return { ok: true }; // متحطتش قبل كده، مفيش داعي نبعت تاني
        }

        const newTags = [...existingTags, WANI_CONFIRMED_TAG].join(", ");
        const putRes = await fetch(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}.json`,
            {
                method: "PUT",
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ order: { id: Number(shopifyOrderId), tags: newTags } }),
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!putRes.ok) {
            const errBody = await putRes.text().catch(() => "");
            return { ok: false, error: `update tags failed: HTTP ${putRes.status} ${errBody.slice(0, 200)}` };
        }
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ShopifyAPI] tagShopifyOrderConfirmed error:", message);
        return { ok: false, error: message };
    }
}

// ─── إلغاء الأوردر فعليًا في شوبيفاي (restock تلقائي حسب إعدادات شوبيفاي الافتراضية) ──
export async function cancelShopifyOrder(
    shop: string,
    accessToken: string,
    shopifyOrderId: string | number,
): Promise<{ ok: boolean; error?: string }> {
    try {
        const res = await fetch(
            `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}/cancel.json`,
            {
                method: "POST",
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                },
                // من غير `restock` صراحةً: شوبيفاي بيستخدم الإعداد الافتراضي بتاع المتجر (restock تلقائي)
                body: JSON.stringify({ reason: "customer" }),
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!res.ok) {
            if (res.status === 404) {
                // الأوردر ممكن يكون اتلغى بالفعل من شوبيفاي نفسها — مش فشل حقيقي
                return { ok: true };
            }
            const errBody = await res.text().catch(() => "");
            return { ok: false, error: `cancel failed: HTTP ${res.status} ${errBody.slice(0, 200)}` };
        }
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ShopifyAPI] cancelShopifyOrder error:", message);
        return { ok: false, error: message };
    }
}

// ─── التحقق من وجود صلاحية write_orders في شوبيفاي ────────────────────────────
export async function verifyShopifyOrderScope(
    shop: string,
    accessToken: string,
): Promise<{ hasOrderScope: boolean; currentScopes: string[]; error?: string }> {
    try {
        const res = await fetch(
            `https://${shop}/admin/oauth/access_scopes.json`,
            {
                headers: { "X-Shopify-Access-Token": accessToken },
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!res.ok) {
            return { hasOrderScope: false, currentScopes: [], error: `HTTP ${res.status}` };
        }
        const data = await res.json();
        const scopes: string[] = (data.access_scopes ?? []).map((s: { handle: string }) => s.handle);
        return { hasOrderScope: scopes.includes("write_orders"), currentScopes: scopes };
    } catch (err: any) {
        return { hasOrderScope: false, currentScopes: [], error: err.message };
    }
}

// ─── التحقق من وجود صلاحية read_products في Shopify ──────────────────────────
export async function verifyShopifyProductScope(
    shop: string,
    accessToken: string,
): Promise<{ hasProductScope: boolean; currentScopes: string[]; error?: string }> {
    try {
        const res = await fetch(
            `https://${shop}/admin/oauth/access_scopes.json`,
            {
                headers: { "X-Shopify-Access-Token": accessToken },
                signal: AbortSignal.timeout(8_000),
            },
        );
        if (!res.ok) {
            return { hasProductScope: false, currentScopes: [], error: `HTTP ${res.status}` };
        }
        const data = await res.json();
        const scopes: string[] = (data.access_scopes ?? []).map((s: { handle: string }) => s.handle);
        const hasProductScope = scopes.includes("read_products") || scopes.includes("write_products");
        return { hasProductScope, currentScopes: scopes };
    } catch (err: any) {
        return { hasProductScope: false, currentScopes: [], error: err.message };
    }
}