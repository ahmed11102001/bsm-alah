import { NextRequest, NextResponse } from "next/server";

/**
 * Shopify OAuth Start Endpoint
 * GET /api/shopify/auth?shop=xxx.myshopify.com
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get("shop");

    // ── Validate shop ─────────────────────────────
    if (!shop) {
      return new NextResponse("Missing shop parameter", { status: 400 });
    }

    // ── Validate domain format ────────────────────
    if (!shop.endsWith(".myshopify.com")) {
      return new NextResponse("Invalid shop domain", { status: 400 });
    }

    // ── Build OAuth URL ───────────────────────────
    const apiKey = process.env.SHOPIFY_API_KEY!;
    const appUrl = process.env.SHOPIFY_APP_URL!;

    const redirectUri = `${appUrl}/api/shopify/callback`;

    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
    ].join(",");

    // ── Generate install URL ──────────────────────
    const installUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code`;

    console.log("[Shopify Auth] Redirecting to:", installUrl);

    // ── Redirect to Shopify ───────────────────────
    return NextResponse.redirect(installUrl);
  } catch (error) {
    console.error("[Shopify Auth] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}