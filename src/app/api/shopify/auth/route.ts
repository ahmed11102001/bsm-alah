import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/shopify/auth?shop=xxx.myshopify.com
 *
 * الإصلاحات:
 *   1. إضافة `state` parameter (كان ناقص — الـ callback كان بيرفض كل طلب)
 *   2. جيب userId من الـ session وحطه في الـ state عشان الـ callback يتحقق منه
 *   3. التحقق من تسجيل الدخول قبل البدء
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    // ── Validate shop ─────────────────────────────────────────────────────────
    if (!shop) {
      return new NextResponse("Missing shop parameter", { status: 400 });
    }

    if (!shop.endsWith(".myshopify.com")) {
      return new NextResponse("Invalid shop domain", { status: 400 });
    }

    // ── تأكد من تسجيل دخول اليوزر ────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login?redirect=/api/shopify/auth?shop=${shop}`;
      return NextResponse.redirect(loginUrl);
    }

    const user = await prisma.user.findUnique({
      where:  { email: session.user.email },
      select: { id: true, parentId: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 401 });
    }

    // لو الـ user عضو في workspace — استخدم ID الأونر
    const userId = user.parentId ?? user.id;

    // ── Build state (base64 JSON) ──────────────────────────────────────────────
    // الـ callback هيحتاج userId للتحقق + timestamp للتأكد مش expired
    const statePayload = {
      userId,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");

    // ── Build OAuth URL ───────────────────────────────────────────────────────
    const apiKey     = process.env.SHOPIFY_API_KEY!;
    const appUrl     = process.env.SHOPIFY_APP_URL!;
    const redirectUri = `${appUrl}/api/shopify/callback`;

    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_customers",
      "write_customers",
    ].join(",");

    const installUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&grant_options[]=value`;

    console.log("[Shopify Auth] Redirecting to:", installUrl);

    return NextResponse.redirect(installUrl);

  } catch (error) {
    console.error("[Shopify Auth] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}