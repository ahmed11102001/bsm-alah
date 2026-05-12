import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // ── Verify session ───────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json();
    const { shop } = body;

    if (!shop || typeof shop !== "string") {
      return NextResponse.json(
        { error: "رابط المتجر مطلوب" },
        { status: 400 }
      );
    }

    // ── Normalize shop domain ───────────────────────────────────────────────
    const normalizedShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(normalizedShop)) {
      return NextResponse.json(
        { error: "رابط المتجر غير صالح" },
        { status: 400 }
      );
    }

    // ── Get DB user ─────────────────────────────────────────────────────────
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, parentId: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const userId = dbUser.parentId ?? dbUser.id;

    // ── Create state ────────────────────────────────────────────────────────
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        random: crypto.randomUUID(),
      })
    ).toString("base64");

    // ── Shopify OAuth URL ───────────────────────────────────────────────────
    const apiKey = process.env.SHOPIFY_API_KEY!;
    const appUrl = process.env.SHOPIFY_APP_URL!;

    const redirectUri = `${appUrl}/api/shopify/callback`;

    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_customers",
      "write_customers",
    ].join(",");

    const authUrl =
      `https://${normalizedShop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    return NextResponse.json({
      success: true,
      authUrl,
      shop: normalizedShop,
    });
  } catch (error) {
    console.error("[Shopify Install] Error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء الربط" },
      { status: 500 }
    );
  }
}