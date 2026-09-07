// src/app/api/shopify/callback/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  نهاية فلو الربط التلقائي (Shopify Public App OAuth — Authorization Code Grant).
//
//  يستقبل ?code&shop&state من Shopify بعد موافقة التاجر، يتحقق من توقيع الـstate
//  (HMAC + صلاحية 10 دقائق)، يستبدل الـcode بتوكن دائم، ويحفظه في نفس حقل
//  ShopifyStore.accessToken — يعني صفر تعديل على shopify-auth.ts، والـresolver
//  بيتعامل معه كـ legacy_token (أولوية قصوى) تلقائيًا.
//
//  أي فشل → redirect على /dashboard?tab=api مع shopify_error واضح.
//  الميزة مقفولة خلف SHOPIFY_APP_CLIENT_ID (راجع auth/route.ts).
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import crypto from "crypto";
import { getValidShopifyAccessToken } from "@/lib/shopify-auth";

const STATE_TTL_MS = 10 * 60 * 1000; // صلاحية الـstate: 10 دقائق ضد الـreplay

function verifyState(state: string): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const [email, nonce, ts, signature] = decoded.split(".");
    if (!email || !nonce || !ts || !signature) return null;
    const payload = `${email}.${nonce}.${ts}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    // مقارنة ثابتة الزمن لمنع timing attacks
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    if (Date.now() - Number(ts) > STATE_TTL_MS) return null;
    return email;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aiwni.com";
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/dashboard?tab=api&shopify_error=${reason}`, appUrl));

  const code = req.nextUrl.searchParams.get("code");
  const shop = req.nextUrl.searchParams.get("shop");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !shop || !state) return fail("missing_params");
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) return fail("invalid_shop");

  const email = verifyState(state);
  if (!email) return fail("invalid_state");

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, parentId: true },
  });
  if (!dbUser) return fail("user_not_found");
  const userId = dbUser.parentId ?? dbUser.id;

  const clientId = process.env.SHOPIFY_APP_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("oauth_not_configured");

  // ── استبدال الـcode بتوكن دائم (Authorization Code Grant) ─────────────────
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!tokenRes?.ok) return fail("token_exchange_failed");

  const data = (await tokenRes.json().catch(() => ({}))) as { access_token?: unknown };
  if (typeof data.access_token !== "string" || !data.access_token) return fail("no_token");

  // ── منع ربط متجر مربوط بحساب آخر (نفس قاعدة install/route.ts) ─────────────
  const existingStore = await prisma.shopifyStore.findFirst({
    where: { shop, userId: { not: userId } },
  });
  if (existingStore) return fail("shop_taken");

  // ── حفظ التوكن في نفس حقل accessToken — نفس مسار legacy_token بالظبط ──────
  // ملاحظة: عمدًا لا نمسح clientId/clientSecret/cached* لو موجودة من ربط يدوي
  // سابق — الـresolver بيدّي الأولوية للدائم على أي حال.
  await prisma.shopifyStore.upsert({
    where: { userId },
    update: {
      shop,
      storeName: shop.replace(".myshopify.com", ""),
      accessToken: encryptToken(data.access_token),
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      shop,
      storeName: shop.replace(".myshopify.com", ""),
      accessToken: encryptToken(data.access_token),
      isActive: true,
    },
  });

  // ── تسجيل الـwebhooks + تشغيل مزامنة المنتجات — نفس منطق install/route.ts ──
  // (fire-and-forget جزئيًا: الفشل هنا لا يلغي الربط الناجح نفسه)
  try {
    const savedStore = await prisma.shopifyStore.findUnique({ where: { userId } });
    if (savedStore) {
      const { generateShopifyWebhookUrl } = await import("@/app/api/shopify/webhooks/route");
      const { registerAllWebhooks } = await import("@/app/api/shopify/install/route");
      const webhookUrl = generateShopifyWebhookUrl(userId);
      const resolvedToken = await getValidShopifyAccessToken(savedStore);
      if (resolvedToken) {
        await registerAllWebhooks(shop, resolvedToken, webhookUrl);
        const { verifyShopifyProductScope } = await import("@/lib/shopify-api");
        const scopeCheck = await verifyShopifyProductScope(shop, resolvedToken);
        if (scopeCheck.hasProductScope) {
          const { inngest } = await import("@/inngest/client");
          void inngest.send({ name: "product/sync.requested", data: { userId, source: "shopify" } }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("[Shopify OAuth] Post-connect setup failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.redirect(new URL("/dashboard?tab=api&shopify_connected=1", appUrl));
}
