// src/app/api/shopify/auth/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  بداية فلو الربط التلقائي (Shopify Public App OAuth — Authorization Code Grant).
//
//  الميزة مقفولة بالكامل خلف SHOPIFY_APP_CLIENT_ID: من غيره الـroute يرجع 503
//  والزرار لا يظهر في الواجهة أصلًا — صفر تأثير على الطريقتين الحاليتين
//  (Legacy Token / Client Credentials) لحد ما التطبيق العام يتوافق عليه.
//
//  الفلو: GET /api/shopify/auth?shop=xxx.myshopify.com (يوزر مسجل دخول)
//       → redirect لصفحة موافقة Shopify (مع state موقّع بـHMAC يحمل هوية اليوزر)
//       → Shopify ترجع على /api/shopify/callback?code=...&shop=...&state=...
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeShopDomain } from "@/lib/shopify-domain";
import { requirePermission } from "@/lib/permissions";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");
  if (denied) return denied;
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const clientId = process.env.SHOPIFY_APP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "الربط التلقائي غير مفعّل حاليًا" }, { status: 503 });
  }

  const shopParam = req.nextUrl.searchParams.get("shop");
  const shop = normalizeShopDomain(shopParam ?? "");
  if (!shop) {
    return NextResponse.json({ error: "دومين Shopify غير صالح — بصيغة متجر.myshopify.com" }, { status: 400 });
  }

  // ── حماية CSRF + تمرير هوية اليوزر عبر state موقّع (بدون جدول DB إضافي) ──
  // التوقيع بـ NEXTAUTH_SECRET — يُتحقق منه في الـcallback مع حد 10 دقائق.
  // الصيغة: base64url(JSON) + "." + HMAC — آمنة تمامًا مع الإيميلات التي
  // تحتوي نقاط (لا نعتمد أبدًا على تقسيم النص بالنقاط لاستخراج الحقول).
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    return NextResponse.json({ error: "إعداد المصادقة ناقص" }, { status: 500 });
  }
  const nonce = crypto.randomBytes(16).toString("hex");
  const payloadB64 = Buffer.from(
    JSON.stringify({ email: session.user.email, nonce, ts: Date.now() })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", nextAuthSecret)
    .update(payloadB64)
    .digest("hex");
  const state = `${payloadB64}.${signature}`;

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://aiwni.com"}/api/shopify/callback`;
  const scopes = process.env.SHOPIFY_APP_SCOPES ?? "read_orders,write_orders,read_products,read_customers,read_checkouts";

  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}
