// src/app/api/shopify/compliance/route.ts
// ══════════════════════════════════════════════════════════════════════════════
//  Endpoint واحد مشترك لكل التجار للـ3 GDPR compliance webhooks الإجبارية:
//    customers/data_request, customers/redact, shop/redact
//
//  ليه منفصل عن /api/shopify/webhooks:
//  - شوبيفاي بترفض تسجيل الـ3 topics دول عبر REST /webhooks.json العادي.
//    لازم تتسجل *مرة واحدة بس* من Partner Dashboard → App → Configuration →
//    Compliance webhooks (أو shopify.app.toml)، بـURL واحد ثابت لكل التجار.
//  - URL واحد يعني مفيش uid في الـquery string زي باقي الـwebhooks — بنحدد
//    المتجر من shop_domain/shop_id اللي جايين في الـbody نفسه.
//
//  الأمان: الـHMAC هنا دايمًا بـ SHOPIFY_APP_CLIENT_SECRET (سر التطبيق نفسه)،
//  مش سر أي متجر لوحده — لأن Partner Dashboard compliance webhooks مربوطة
//  بالتطبيق ككل، مش بطريقة ربط كل تاجر (legacy token / client credentials).
//
//  خطوة يدوية مطلوبة *مرة واحدة* من صاحب التطبيق: يحط الـURL ده في
//  Partner Dashboard → Compliance webhooks:
//    {NEXT_PUBLIC_APP_URL}/api/shopify/compliance
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import {
  handleCustomerDataRequest,
  handleCustomerRedact,
  handleShopRedact,
  type GdprCustomerPayload,
  type GdprShopPayload,
} from "@/app/api/shopify/webhooks/route";

function verifyHmac(rawBody: string, header: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "Shopify Compliance Webhooks" });
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.SHOPIFY_APP_CLIENT_SECRET;
    const hmacHeader =
      req.headers.get("X-Shopify-Hmac-Sha256") ?? req.headers.get("x-shopify-hmac-sha256");
    const rawBody = await req.text();

    if (!secret || !hmacHeader || !verifyHmac(rawBody, hmacHeader, secret)) {
      console.warn("[Shopify Compliance] Invalid or unverifiable HMAC — rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const topic = req.headers.get("X-Shopify-Topic") ?? req.headers.get("x-shopify-topic") ?? "";
    const shopDomain =
      (payload as GdprCustomerPayload | GdprShopPayload)?.shop_domain;

    if (typeof shopDomain !== "string" || !shopDomain) {
      console.warn(`[Shopify Compliance] ${topic} — missing shop_domain in payload`);
      return NextResponse.json({ status: "ignored" });
    }

    const store = await prisma.shopifyStore.findFirst({
      where: { shop: shopDomain },
      select: { id: true, userId: true, shop: true },
    });

    // مفيش متجر مربوط بالدومين ده (اتشال قبل كده مثلًا) — نرد 200 عادي،
    // شوبيفاي بس عايزة تعرف إننا استلمنا الطلب.
    if (!store) {
      console.log(`[Shopify Compliance] ${topic} — no store found for ${shopDomain}`);
      return NextResponse.json({ status: "ignored" });
    }

    switch (topic) {
      case "customers/data_request":
        await handleCustomerDataRequest(payload, store.userId, store);
        break;
      case "customers/redact":
        await handleCustomerRedact(payload, store.userId, store);
        break;
      case "shop/redact":
        await handleShopRedact(payload, store.userId, store);
        break;
      default:
        console.log(`[Shopify Compliance] Unexpected topic on this endpoint: ${topic}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[Shopify Compliance] Unexpected error:", error);
    // شرط شوبيفاي: رد دائمًا 200 series بعد التحقق من التوقيع، حتى لو فشل داخليًا
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
