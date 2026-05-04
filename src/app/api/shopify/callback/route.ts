import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import {
  verifyShopifyHmac,
  exchangeCodeForToken,
  saveShopifyStore,
  fetchShopifyShopInfo,
  registerShopifyWebhooks,
} from "@/lib/shopify";

/**
 * GET /api/shopify/callback
 * 
 * Shopify OAuth callback endpoint.
 * Handles the authorization code and exchanges it for an access token.
 * 
 * Query parameters:
 * - code: Authorization code from Shopify
 * - hmac: HMAC signature for verification
 * - shop: Shop domain
 * - state: State token for CSRF protection
 * - timestamp: Request timestamp
 */
export async function GET(req: NextRequest) {
  try {
    // ── Step 1: Extract query parameters ─────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const hmac = searchParams.get("hmac");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");
    const timestamp = searchParams.get("timestamp");

    // ── Step 2: Validate required parameters ─────────────────────────────────
    if (!code || !hmac || !shop || !state || !timestamp) {
      console.error("[Shopify Callback] Missing required parameters");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=missing_params`
      );
    }

    // ── Step 3: Verify HMAC signature ────────────────────────────────────────
    const queryParams = {
      code,
      shop,
      state,
      timestamp,
    };

    if (!verifyShopifyHmac(queryParams, hmac)) {
      console.error("[Shopify Callback] HMAC verification failed");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=invalid_hmac`
      );
    }

    // ── Step 4: Verify state token for CSRF protection ──────────────────────
    let stateData: { userId: string; timestamp: number } | null = null;
    try {
      const decoded = Buffer.from(state, "base64").toString("utf8");
      stateData = JSON.parse(decoded);

      // Check if state is not too old (30 minutes)
      if (Date.now() - stateData.timestamp > 30 * 60 * 1000) {
        console.error("[Shopify Callback] State token expired");
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=state_expired`
        );
      }
    } catch (error) {
      console.error("[Shopify Callback] Invalid state token:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=invalid_state`
      );
    }

    if (!stateData) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=invalid_state`
      );
    }

    // ── Step 5: Get current session ──────────────────────────────────────────
    const session = await getServerSession();

    if (!session?.user?.email) {
      console.error("[Shopify Callback] User not authenticated");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=not_authenticated`
      );
    }

    // ── Step 6: Verify state matches current user ────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user || user.id !== stateData.userId) {
      console.error("[Shopify Callback] State user mismatch");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=user_mismatch`
      );
    }

    // ── Step 7: Exchange authorization code for access token ─────────────────
    const tokenData = await exchangeCodeForToken(shop, code);

    if (!tokenData) {
      console.error("[Shopify Callback] Failed to exchange code for token");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=token_exchange_failed`
      );
    }

    // ── Step 8: Fetch shop information ───────────────────────────────────────
    const shopInfo = await fetchShopifyShopInfo(shop, tokenData.accessToken);

    if (!shopInfo) {
      console.error("[Shopify Callback] Failed to fetch shop info");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=shop_info_failed`
      );
    }

    // ── Step 9: Save Shopify store to database ───────────────────────────────
    const saveResult = await saveShopifyStore(
      user.id,
      shop,
      tokenData.accessToken,
      tokenData.scope
    );

    if (!saveResult.success) {
      console.error("[Shopify Callback] Failed to save store:", saveResult.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=save_failed`
      );
    }

    // ── Step 10: Register webhooks with Shopify ──────────────────────────────
    const webhookResult = await registerShopifyWebhooks(shop, tokenData.accessToken);

    if (!webhookResult.success) {
      console.warn("[Shopify Callback] Failed to register webhooks:", webhookResult.error);
      // Don't fail the entire flow, just warn
    }

    // ── Step 11: Redirect to success page ────────────────────────────────────
    console.log(`[Shopify Callback] Successfully connected store: ${shop}`);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?success=true&shop=${encodeURIComponent(shop)}`
    );
  } catch (error) {
    console.error("[Shopify Callback] Unexpected error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/api?error=unexpected`
    );
  }
}
