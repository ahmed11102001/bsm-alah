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