// src/lib/shopify-auth.ts
// ══════════════════════════════════════════════════════════════════════════════
//  حل توكن شوبيفاي المركزي (Token Resolver) — يدعم 3 طرق للمصادقة:
//
//  1) legacy_token (توكن دائم shpat_ من Custom App قديمة — قبل يناير 2026،
//     أو Public App OAuth لسه بيدي توكن دائم): مخزن في ShopifyStore.accessToken
//     (مشفر). لو tokenExpiresAt فاضي بيرجع مباشرة من غير أي شبكة زي زمان.
//     لو tokenExpiresAt متملي (يعني شوبيفاي بدأت تدي توكن OAuth منتهي
//     الصلاحية للتطبيق ده) بيتحقق من الصلاحية ويجدده بالـ refreshToken
//     قبل ما يرجعه — التفاصيل في "OAuth expiring offline token" تحت.
//
//  2) client_credentials (تطبيقات Dev Dashboard — clientId + clientSecret):
//     التوكن مؤقت (~24 ساعة) وبيتجاب برمجيًا من:
//       POST https://{shop}/admin/oauth/access_token
//       grant_type=client_credentials&client_id=...&client_secret=...
//     الرد: { access_token, scope, expires_in } (expires_in = 86399).
//     الناتج بيتخزن مشفرًا في cachedAccessToken مع ميعاد انتهائه، وبيتجدد
//     تلقائيًا بهامش أمان 60 ثانية (نفس pattern توثيق شوبيفاي الرسمي).
//
//  3) OAuth expiring offline token (Public App — إلزامي بحلول 1 يناير 2027):
//     الاستبدال الأولي في callback/route.ts بيرجع كمان expires_in +
//     refresh_token لو شوبيفاي بدأت تفعّل السلوك الجديد لهذا الـApp؛ بيتخزنوا
//     في tokenExpiresAt/refreshToken. التجديد:
//       POST https://{shop}/admin/oauth/access_token
//       grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...
//     الرد بيرجع access_token + refresh_token **جديدين** (rotation — لازم
//     نخزن refresh_token الجديد كل مرة، القديم بيبقى غير صالح فورًا).
//     refresh_token صالح 90 يوم من غير استخدام — لو انتهى، لازم إعادة ربط
//     يدوية من التاجر (مفيش حل برمجي بديل).
//
//  أولوية الحل عند وجود أكتر من طريقة: legacy_token/OAuth أولاً، بعدين
//  client_credentials — نفس ترتيب السنين اللي فاتت، من غير أي تغيير.
//
//  ملاحظة عن التزامن: لو نداءان جدّدا الكاش/التوكن في نفس اللحظة، آخر كتابة
//  تفوز — لا حاجة لـ locking لأن أي نتيجة صالحة تكفي (نفس فلسفة client_credentials).
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
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export const SHOPIFY_CREDENTIALS_SELECT = {
  id: true,
  shop: true,
  accessToken: true,
  clientId: true,
  clientSecret: true,
  cachedAccessToken: true,
  cachedTokenExpiresAt: true,
  refreshToken: true,
  tokenExpiresAt: true,
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

// ─── تجديد توكن OAuth المنتهي الصلاحية بالـrefresh_token (rotation) ─────────
// بيرجع null عند أي فشل (شبكة، أو refresh_token منتهي بعد 90 يوم بدون
// استخدام — في الحالة دي محتاج إعادة ربط يدوية من التاجر، مفيش بديل برمجي).
export async function refreshShopifyOAuthToken(
  shop: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const clientId = process.env.SHOPIFY_APP_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[ShopifyAuth] Cannot refresh OAuth token — SHOPIFY_APP_CLIENT_ID/SECRET missing");
    return null;
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[ShopifyAuth] OAuth refresh failed for ${shop} (HTTP ${res.status}): ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof data.access_token !== "string" || !data.access_token) return null;
    // شوبيفاي بترجع refresh_token جديد كل مرة (القديم بيتلغى فورًا) — لو
    // مرجعتوش لأي سبب، نكمل نستخدم القديم كـ fallback بدل ما نفقد القدرة
    // على أي تجديد لاحق (أفضل من فشل كامل).
    const newRefreshToken = typeof data.refresh_token === "string" && data.refresh_token
      ? data.refresh_token
      : refreshToken;
    const expiresIn = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;

    return { accessToken: data.access_token, refreshToken: newRefreshToken, expiresIn };
  } catch (err) {
    console.error("[ShopifyAuth] OAuth refresh network error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── الدالة المركزية: رجّع توكن صالح للاستخدام في X-Shopify-Access-Token ─────
export async function getValidShopifyAccessToken(
  store: ShopifyStoreCredentials,
): Promise<string | null> {
  // 1) accessToken أولاً — قد يكون توكن دائم (legacy) أو توكن OAuth منتهي
  // الصلاحية (لو tokenExpiresAt متملي). السلوك الافتراضي (tokenExpiresAt
  // فاضي) زي زمان بالظبط: رجوع مباشر من غير أي شبكة.
  if (store.accessToken) {
    if (!store.tokenExpiresAt) {
      return decryptToken(store.accessToken);
    }

    // توكن OAuth منتهي الصلاحية — لسه صالح؟
    if (Date.now() < store.tokenExpiresAt.getTime() - REFRESH_SAFETY_MARGIN_MS) {
      return decryptToken(store.accessToken);
    }

    // قرب ينتهي أو انتهى — جدده بالـrefresh_token لو موجود
    if (!store.refreshToken) {
      console.error(`[ShopifyAuth] Expiring OAuth token needs refresh but no refreshToken stored for ${store.shop}`);
      return null;
    }

    const refreshed = await refreshShopifyOAuthToken(store.shop, decryptToken(store.refreshToken));
    if (!refreshed) return null; // ممكن يكون محتاج إعادة ربط يدوية بعد 90 يوم

    const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
    await prisma.shopifyStore
      .update({
        where: { id: store.id },
        data: {
          accessToken: encryptToken(refreshed.accessToken),
          refreshToken: encryptToken(refreshed.refreshToken),
          tokenExpiresAt: expiresAt,
        },
      })
      .catch((err) => console.error("[ShopifyAuth] Failed to persist refreshed OAuth token:", err));

    return refreshed.accessToken;
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
