// src/app/api/woocommerce/connect/route.ts
// ─── ربط WooCommerce عن طريق Webhook — مع تحقق من الدومين ────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { generateWooWebhookUrl }     from "@/app/api/woocommerce/URL/route";

// ── التحقق إن الدومين موقع WooCommerce حقيقي ────────────────────────────────
async function verifyStoreDomain(url: string): Promise<boolean> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(`${normalized}/wp-json/wc/v3`, {
      method:  "HEAD",
      redirect: "follow",
      signal:  AbortSignal.timeout(8_000),
      headers: { "User-Agent": "WhatsPro-Verify/1.0" },
    });
    // WooCommerce REST API endpoint — لو رد حتى بـ 401 = موجود
    return res.status < 500;
  } catch {
    return false;
  }
}

// ─── POST — ربط متجر WooCommerce ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

    const body = await req.json();
    const { storeName, storeUrl } = body as { storeName?: string; storeUrl?: string };

    if (!storeName?.trim())
      return NextResponse.json({ error: "اسم المتجر مطلوب" }, { status: 400 });

    // ── التحقق من الـ URL لو أدخله المستخدم ────────────────────────────────
    if (storeUrl?.trim()) {
      const isReal = await verifyStoreDomain(storeUrl.trim());
      if (!isReal) {
        return NextResponse.json(
          { error: `الموقع "${storeUrl}" لا يبدو أنه متجر WooCommerce — تحقق من الرابط` },
          { status: 422 }
        );
      }
    }

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const userId = dbUser.parentId ?? dbUser.id;

    const store = await prisma.wooCommerceStore.upsert({
      where:  { userId },
      update: {
        storeName: storeName.trim(),
        storeUrl:  storeUrl?.trim() || null,
        isActive:  true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        storeName: storeName.trim(),
        storeUrl:  storeUrl?.trim() || null,
        isActive:  true,
      },
    });

    return NextResponse.json({
      success:    true,
      storeName:  store.storeName,
      webhookUrl: generateWooWebhookUrl(userId),
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
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where:  { email: session.user.email },
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