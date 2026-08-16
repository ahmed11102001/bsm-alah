// src/app/api/woocommerce/connect/route.ts
// ─── ربط WooCommerce موحّد (Webhook + REST API) ──────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateWooWebhookUrl }     from "@/app/api/woocommerce/URL/route";
import { checkFeature, guardResponse } from "@/lib/plan-guard";
import { encryptToken }              from "@/lib/crypto";
import { inngest }                   from "@/inngest/client";
import { requirePermission } from "@/lib/permissions";

// ─── POST — ربط متجر WooCommerce (موحّد: credentials + webhook) ──────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const storeName    = typeof body.storeName === "string" ? body.storeName.trim() : "";
    const rawUrl       = typeof body.storeUrl === "string" ? body.storeUrl.trim() : "";
    const consumerKey  = typeof body.consumerKey === "string" ? body.consumerKey.trim() : "";
    const consumerSecret = typeof body.consumerSecret === "string" ? body.consumerSecret.trim() : "";

    if (!storeName)
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });
    if (!rawUrl)
      return NextResponse.json({ error: "رابط المتجر مطلوب" }, { status: 400 });
    if (!consumerKey || !consumerSecret)
      return NextResponse.json({ error: "Consumer Key و Consumer Secret مطلوبين" }, { status: 400 });

    // ── تنسيق الـ URL ──────────────────────────────────────────────────────
    const storeUrl = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, "");
    if (!/^https:\/\//i.test(storeUrl))
      return NextResponse.json({ error: "WooCommerce REST API requires HTTPS" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    // ── Plan guard: store integration — pro فأعلى ──
    const wgGuard = await checkFeature(userId, "storeIntegration");
    const wgBlocked = guardResponse(wgGuard);
    if (wgBlocked) return wgBlocked;

    // ── التحقق من صحة الـ credentials عبر REST API ──────────────────────────
    const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
    const testRes = await fetch(`${storeUrl}/wp-json/wc/v3/products?per_page=1`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (testRes.status === 401 || testRes.status === 403)
      return NextResponse.json({ error: "Consumer Key/Secret غلط أو مفيش صلاحيات كافية" }, { status: 422 });
    if (!testRes.ok)
      return NextResponse.json({ error: "تعذر الاتصال بمتجر WooCommerce. تأكد من رابط المتجر وبيانات API والصلاحيات." }, { status: 422 });

    const products = await testRes.json().catch(() => []);
    const productsAvailable = Number(
      testRes.headers.get("X-WP-Total") ||
      testRes.headers.get("x-wp-total") ||
      (Array.isArray(products) ? products.length : 0)
    );

    // ── Upsert Store — حفظ كل البيانات مرة واحدة ──────────────────────────
    const store = await prisma.wooCommerceStore.upsert({
      where:  { userId },
      update: {
        storeName,
        storeUrl,
        consumerKey:    encryptToken(consumerKey),
        consumerSecret: encryptToken(consumerSecret),
        isConnected:    true,
        isActive:       true,
        updatedAt:      new Date(),
      },
      create: {
        userId,
        storeName,
        storeUrl,
        consumerKey:    encryptToken(consumerKey),
        consumerSecret: encryptToken(consumerSecret),
        isConnected:    true,
        isActive:       true,
      },
    });

    // ── مزامنة المنتجات تلقائياً في الخلفية ──────────────────────────────────
    await inngest.send({
      name: "product/sync.requested",
      data: { userId, source: "woocommerce" },
    }).catch((err) => {
      console.error("[WooCommerce Connect] Failed to trigger product sync:", err);
    });

    return NextResponse.json({
      success:           true,
      storeName:         store.storeName,
      webhookUrl:        generateWooWebhookUrl(userId),
      productsAvailable,
      productSyncStarted: true,
    });

  } catch (error) {
    console.error("[WooCommerce Connect] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

// ─── DELETE — فك ربط المتجر ─────────────────────────────────────────────────
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    const denied = requirePermission(session, "STORE_INTEGRATIONS_MANAGE");

    if (denied) return denied;

    const dbUser = await prisma.user.findUnique({
      where:  { email: session!.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;
    await prisma.wooCommerceStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WooCommerce Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}