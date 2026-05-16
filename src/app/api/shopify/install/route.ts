// src/app/api/shopify/install/route.ts
// ─── ربط Shopify عن طريق Webhook مباشرة — مع تحقق من الدومين ───────────────
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateShopifyWebhookUrl } from "@/app/api/shopify/webhooks/route";

// ── التحقق إن الدومين متجر Shopify حقيقي ────────────────────────────────────
async function verifyShopifyDomain(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      method:  "HEAD",
      redirect: "follow",
      signal:  AbortSignal.timeout(8_000),
      headers: { "User-Agent": "WhatsPro-Verify/1.0" },
    });
    // Shopify دايماً بيرد على robots.txt سواء كان 200 أو 301
    // لو 404 أو network error → مش Shopify
    return res.status < 500;
  } catch {
    return false;
  }
}

// ── تنظيف وتوحيد الدومين ──────────────────────────────────────────────────────
function normalizeShopDomain(input: string): string | null {
  const clean = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0];

  // لو المستخدم كتب الاسم بدون .myshopify.com نضيفه تلقائياً
  const domain = clean.includes(".")
    ? clean
    : `${clean}.myshopify.com`;

  // validate format
  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain)) return null;
  return domain;
}

// ─── POST — ربط متجر Shopify جديد ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const body = await req.json();
    const { storeName, shopDomain } = body as {
      storeName?:  string;
      shopDomain?: string;
    };

    if (!storeName?.trim()) {
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });
    }

    // ── التحقق من الدومين لو أدخله المستخدم ────────────────────────────────
    let verifiedDomain: string;

    if (shopDomain?.trim()) {
      const normalized = normalizeShopDomain(shopDomain);
      if (!normalized) {
        return NextResponse.json(
          { error: "الدومين غير صالح — يجب أن يكون بصيغة متجر.myshopify.com" },
          { status: 400 }
        );
      }

      const exists = await verifyShopifyDomain(normalized);
      if (!exists) {
        return NextResponse.json(
          { error: `المتجر "${normalized}" غير موجود على Shopify — تحقق من الاسم` },
          { status: 422 }
        );
      }

      verifiedDomain = normalized;
    } else {
      // المستخدم مش حاطط دومين → نستخدم اسم المتجر كـ placeholder غير verified
      // ونحفظه بـ storeName فقط بدون domain verification
      verifiedDomain = `${storeName.trim().toLowerCase().replace(/\s+/g, "-")}.myshopify.com`;
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }
    const userId = dbUser.parentId ?? dbUser.id;

    // ── تحقق مش متجر مسجل بحساب تاني ─────────────────────────────────────────
    const existingStore = await prisma.shopifyStore.findFirst({
      where: { shop: verifiedDomain, userId: { not: userId } },
    });
    if (existingStore) {
      return NextResponse.json(
        { error: "هذا المتجر مرتبط بحساب آخر بالفعل" },
        { status: 409 }
      );
    }

    // ── حفظ المتجر ───────────────────────────────────────────────────────────
    await prisma.shopifyStore.upsert({
      where:  { userId },
      update: {
        shop:      verifiedDomain,
        storeName: storeName.trim(),
        isActive:  true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        shop:      verifiedDomain,
        storeName: storeName.trim(),
        isActive:  true,
      },
    });

    const webhookUrl = generateShopifyWebhookUrl(userId);

    return NextResponse.json({
      success:    true,
      storeName:  storeName.trim(),
      domain:     verifiedDomain,
      webhookUrl,
    });

  } catch (error) {
    console.error("[Shopify Install] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

// ─── DELETE — فك ربط المتجر ────────────────────────────────────────────────────
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = dbUser.parentId ?? dbUser.id;
    await prisma.shopifyStore.deleteMany({ where: { userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shopify Delete] Error:", error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}