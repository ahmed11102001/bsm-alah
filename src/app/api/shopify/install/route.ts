import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { generateShopifyAuthUrl } from "@/lib/shopify";

/**
 * POST /api/shopify/install
 * 
 * Initiates the Shopify OAuth flow.
 * 
 * Request body:
 * {
 *   "shop": "store.myshopify.com" or "store"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Verify user is authenticated ─────────────────────────────────
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "غير مصرح - يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    // ── Step 2: Parse request body ───────────────────────────────────────────
    const body = await req.json();
    const { shop } = body;

    if (!shop || typeof shop !== "string") {
      return NextResponse.json(
        { error: "رابط المتجر مطلوب (shop)" },
        { status: 400 }
      );
    }

    // ── Step 3: Validate shop format ─────────────────────────────────────────
    const normalizedShop = shop.includes("myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    // Basic validation
    if (!normalizedShop.match(/^[a-zA-Z0-9-]+\.myshopify\.com$/)) {
      return NextResponse.json(
        { error: "صيغة رابط المتجر غير صحيحة" },
        { status: 400 }
      );
    }

    // ── Step 4: Generate state token for CSRF protection ──────────────────────
    // جيب الـ user ID الحقيقي من الـ DB عشان نقارنه في الـ callback صح
    const dbUser = await (await import("@/lib/prisma")).default.user.findUnique({
      where:  { email: session.user.email! },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const state = Buffer.from(
      JSON.stringify({
        userId:    dbUser.id,           // ← UUID الحقيقي مش الـ email
        timestamp: Date.now(),
        random:    Math.random().toString(36).substring(7),
      })
    ).toString("base64");

    // ── Step 5: Generate authorization URL ───────────────────────────────────
    const authUrl = generateShopifyAuthUrl(normalizedShop, state);

    return NextResponse.json({
      success: true,
      authUrl,
      shop: normalizedShop,
    });
  } catch (error) {
    console.error("[Shopify Install] Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء بدء عملية الربط" },
      { status: 500 }
    );
  }
}