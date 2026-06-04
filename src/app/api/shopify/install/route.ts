// src/app/api/shopify/install/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";

// الـ topics اللي محتاجينها — بالترتيب الصح
const REQUIRED_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/fulfilled",
  "checkouts/create",   // ← السلة المهجورة
  "checkouts/update",   // ← السلة المهجورة (يجي أكتر من مرة)
  "customers/create",
  "customers/update",
] as const;

// ── تنظيف وتوحيد الدومين ──────────────────────────────────────────────────────
function normalizeShopDomain(input: string): string | null {
  const clean = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0];

  const domain = clean.includes(".")
    ? clean
    : `${clean}.myshopify.com`;

  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain)) return null;
  return domain;
}

// ── التحقق من الدومين ──────────────────────────────────────────────────────────
async function verifyShopifyDomain(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      method:  "HEAD",
      redirect: "follow",
      signal:  AbortSignal.timeout(8_000),
      headers: { "User-Agent": "WhatsPro-Verify/1.0" },
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

// ── تسجيل webhook واحد في Shopify API ────────────────────────────────────────
async function registerWebhook(
  shop:        string,
  accessToken: string,
  topic:       string,
  address:     string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/2024-01/webhooks.json`,
      {
        method:  "POST",
        headers: {
          "Content-Type":          "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: { topic, address, format: "json" },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 422 = webhook already exists → مش error حقيقي
      if (res.status === 422) return { ok: true };
      return { ok: false, error: body?.errors?.address?.[0] ?? `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "network error" };
  }
}

// ── تسجيل كل الـ webhooks المطلوبة ───────────────────────────────────────────
export async function registerAllWebhooks(
  shop:        string,
  accessToken: string,
  webhookUrl:  string,
): Promise<{ registered: string[]; failed: string[] }> {
  const registered: string[] = [];
  const failed:     string[] = [];

  for (const topic of REQUIRED_TOPICS) {
    const result = await registerWebhook(shop, accessToken, topic, webhookUrl);
    if (result.ok) {
      registered.push(topic);
      console.log(`[Shopify Webhooks] ✓ ${topic}`);
    } else {
      failed.push(topic);
      console.error(`[Shopify Webhooks] ✗ ${topic} — ${result.error}`);
    }
  }

  return { registered, failed };
}

// ── التحقق من صحة الـ Access Token عبر Shopify API ───────────────────────────
async function verifyAccessToken(shop: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: { "X-Shopify-Access-Token": token },
        signal:  AbortSignal.timeout(8_000),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── POST — ربط متجر Shopify + تسجيل Webhooks تلقائياً ───────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

    const body = await req.json();
    const { storeName, shopDomain, accessToken } = body as {
      storeName?:   string;
      shopDomain?:  string;
      accessToken?: string;
    };

    if (!storeName?.trim())
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });

    // ── Normalize الدومين ────────────────────────────────────────────────────
    let verifiedDomain: string;

    if (shopDomain?.trim()) {
      const normalized = normalizeShopDomain(shopDomain);
      if (!normalized)
        return NextResponse.json(
          { error: "الدومين غير صالح — يجب أن يكون بصيغة متجر.myshopify.com" },
          { status: 400 }
        );

      const exists = await verifyShopifyDomain(normalized);
      if (!exists)
        return NextResponse.json(
          { error: `المتجر "${normalized}" غير موجود على Shopify — تحقق من الاسم` },
          { status: 422 }
        );

      verifiedDomain = normalized;
    } else {
      verifiedDomain = `${storeName.trim().toLowerCase().replace(/\s+/g, "-")}.myshopify.com`;
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    // ── تحقق مش متجر مسجل بحساب تاني ──────────────────────────────────────
    const existingStore = await prisma.shopifyStore.findFirst({
      where: { shop: verifiedDomain, userId: { not: userId } },
    });
    if (existingStore)
      return NextResponse.json(
        { error: "هذا المتجر مرتبط بحساب آخر بالفعل" },
        { status: 409 }
      );

    // ── لو في access token: تحقق منه ───────────────────────────────────────
    const cleanToken = accessToken?.trim() || null;
    if (cleanToken) {
      const tokenValid = await verifyAccessToken(verifiedDomain, cleanToken);
      if (!tokenValid)
        return NextResponse.json(
          { error: "الـ Access Token غير صحيح أو منتهي — تحقق من صلاحيات الـ Custom App" },
          { status: 422 }
        );
    }

    // ── حفظ المتجر ──────────────────────────────────────────────────────────
    const savedStore = await prisma.shopifyStore.upsert({
      where:  { userId },
      update: {
        shop:        verifiedDomain,
        storeName:   storeName.trim(),
        isActive:    true,
        accessToken: cleanToken,
        updatedAt:   new Date(),
      },
      create: {
        userId,
        shop:        verifiedDomain,
        storeName:   storeName.trim(),
        isActive:    true,
        accessToken: cleanToken,
      },
    });

    const webhookUrl = generateShopifyWebhookUrl(userId);

    // ── تسجيل الـ webhooks تلقائياً لو في token ─────────────────────────────
    let webhooksResult: { registered: string[]; failed: string[] } | null = null;
    if (cleanToken) {
      webhooksResult = await registerAllWebhooks(verifiedDomain, cleanToken, webhookUrl);
    }

    return NextResponse.json({
      success:     true,
      storeName:   storeName.trim(),
      domain:      verifiedDomain,
      webhookUrl,
      webhooks:    webhooksResult
        ? {
            registered: webhooksResult.registered.length,
            failed:     webhooksResult.failed,
            autoSetup:  webhooksResult.failed.length === 0,
          }
        : null,
    });

  } catch (error) {
    console.error("[Shopify Install] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

// ─── DELETE — فك ربط المتجر ───────────────────────────────────────────────────
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;
    await prisma.shopifyStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shopify Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}