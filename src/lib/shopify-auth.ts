// src/lib/shopify-auth.ts
// ══════════════════════════════════════════════════════════════════════════════
//  حل توكن شوبيفاي المركزي (Token Resolver) — يدعم طريقتين للمصادقة:
//
//  1) legacy_token (توكن دائم shpat_ من Custom App قديمة — قبل يناير 2026):
//     مخزن في ShopifyStore.accessToken (مشفر)، بيرجع مباشرة من غير أي شبكة.
//
//  2) client_credentials (تطبيقات Dev Dashboard — clientId + clientSecret):
//     التوكن مؤقت (~24 ساعة) وبيتجاب برمجيًا من:
//       POST https://{shop}/admin/oauth/access_token
//       grant_type=client_credentials&client_id=...&client_secret=...
//     الرد: { access_token, scope, expires_in } (expires_in = 86399).
//     الناتج بيتخزن مشفرًا في cachedAccessToken مع ميعاد انتهائه، وبيتجدد
//     تلقائيًا بهامش أمان 60 ثانية (نفس pattern توثيق شوبيفاي الرسمي).
//
//  أولوية الحل عند وجود الطريقتين معًا: التوكن الدائم (legacy) أولاً —
//  لأنه لا يحتاج أي نداء شبكة ولا ينتهي، فسلوك المتاجر القديمة لا يتغير
//  إطلاقًا حتى لو أُضيفت client credentials لاحقًا.
//
//  ملاحظة عن التزامن: لو نداءان تجديدا الكاش في نفس اللحظة، كلاهما صالح
//  وآخر كتابة تفوز — لا حاجة لـ locking لأن التوكنات المكررة كلها شغالة.
// ══════════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";

// هامش الأمان قبل انتهاء التوكن المؤقت (نفس قيمة مثال شوبيفاي الرسمي)
const REFRESH_SAFETY_MARGIN_MS = 60_000;

export type ShopifyAuthMethod = "legacy_token" | "client_credentials" | "none";

// الحد الأدنى من حقول الصف اللي الـ resolver محتاجها — مرّرها عبر select
// بدل ما تسحب الصف كله (فيه secrets).
export interface ShopifyStoreCredentials {
  id: string;
  shop: string;
  accessToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  cachedAccessToken: string | null;
  cachedTokenExpiresAt: Date | null;
}

export const SHOPIFY_CREDENTIALS_SELECT = {
  id: true,
  shop: true,
  accessToken: true,
  clientId: true,
  clientSecret: true,
  cachedAccessToken: true,
  cachedTokenExpiresAt: true,
} as const;

// ─── نوع الربط الحالي (للعرض في الواجهة) ────────────────────────────────────
export function getShopifyAuthMethod(store: Pick<ShopifyStoreCredentials, "accessToken" | "clientId" | "clientSecret">): ShopifyAuthMethod {
  if (store.accessToken) return "legacy_token";
  if (store.clientId && store.clientSecret) return "client_credentials";
  return "none";
}

// ─── تبادل Client Credentials مقابل توكن مؤقت (نداء شبكة واحد، بدون كاش) ────
// بيرجع null عند أي فشل — ولا يطبع الـ secret أبدًا في الـ logs.
export async function requestClientCredentialsToken(
  shop: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // أشهر سبب: الـ App والمتجر في organization مختلفة (shop_not_permitted)
      // أو بيانات غلط — في الحالتين المشكلة عند التاجر مش عندنا.
      const errBody = await res.text().catch(() => "");
      console.error(
        `[ShopifyAuth] Token exchange failed for shop (HTTP ${res.status}): ${errBody.slice(0, 200)}`
      );
      return null;
    }

    const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof data.access_token !== "string" || !data.access_token) {
      console.error("[ShopifyAuth] Token exchange returned no access_token");
      return null;
    }
    // expires_in = 86399 حسب التوثيق — بنقرأ القيمة الفعلية بدل الترميز الثابت،
    // مع fallback آمن 24 ساعة لو الحقل ناقص.
    const expiresIn =
      typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 86399;

    return { accessToken: data.access_token, expiresIn };
  } catch (err) {
    console.error("[ShopifyAuth] Token exchange network error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── الدالة المركزية: رجّع توكن صالح للاستخدام في X-Shopify-Access-Token ─────
export async function getValidShopifyAccessToken(
  store: ShopifyStoreCredentials,
): Promise<string | null> {
  // 1) التوكن الدائم أولاً — السلوك الحالي 100% بدون أي تغيير
  if (store.accessToken) {
    return decryptToken(store.accessToken);
  }

  // 2) Client Credentials مع كاش وتجديد تلقائي
  if (store.clientId && store.clientSecret) {
    if (
      store.cachedAccessToken &&
      store.cachedTokenExpiresAt &&
      Date.now() < store.cachedTokenExpiresAt.getTime() - REFRESH_SAFETY_MARGIN_MS
    ) {
      return decryptToken(store.cachedAccessToken);
    }

    // clientId معرّف علني (public) ومخزن plain — أما clientSecret فمشفر في DB
    // ويُفك تشفيره لحظة الإرسال فقط، ولا يُطبع أبدًا في الـ logs.
    const fresh = await requestClientCredentialsToken(
      store.shop,
      store.clientId,
      decryptToken(store.clientSecret),
    );
    if (!fresh) return null;

    const expiresAt = new Date(Date.now() + fresh.expiresIn * 1000);
    await prisma.shopifyStore
      .update({
        where: { id: store.id },
        data: {
          cachedAccessToken: encryptToken(fresh.accessToken),
          cachedTokenExpiresAt: expiresAt,
        },
      })
      .catch((err) => console.error("[ShopifyAuth] Failed to cache token:", err));

    return fresh.accessToken;
  }

  // 3) لا توجد أي بيانات اعتماد (ربط يدوي بالـ webhooks فقط)
  return null;
}
