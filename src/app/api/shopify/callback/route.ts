import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import {
  verifyShopifyHmac,
  exchangeCodeForToken,
  saveShopifyStore,
  fetchShopifyShopInfo,
  registerShopifyWebhooks,
} from "@/lib/shopify";

export async function GET(req: NextRequest) {
  try {
    // ── Parse params ────────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);

    const code = searchParams.get("code");
    const hmac = searchParams.get("hmac");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    // ── Validate params ─────────────────────────────────────────────────────
    if (!code || !hmac || !shop || !state) {
      console.error("[Shopify Callback] Missing required params");

      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=missing_params`
      );
    }

    // ── Verify HMAC ─────────────────────────────────────────────────────────
    const queryParams = {
      code,
      shop,
      state,
    };

    const validHmac = verifyShopifyHmac(queryParams, hmac);

    if (!validHmac) {
      console.error("[Shopify Callback] Invalid HMAC");

      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=invalid_hmac`
      );
    }

    // ── Decode state ────────────────────────────────────────────────────────
    let stateData: {
      userId: string;
      timestamp: number;
      random: string;
    };

    try {
      const decoded = Buffer.from(state, "base64").toString("utf8");

      stateData = JSON.parse(decoded);

      // 30 mins expiration
      if (Date.now() - stateData.timestamp > 30 * 60 * 1000) {
        return NextResponse.redirect(
          `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=state_expired`
        );
      }
    } catch (error) {
      console.error("[Shopify Callback] Invalid state", error);

      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=invalid_state`
      );
    }

    // ── Verify session ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/login`
      );
    }

    // ── Get current user ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!user) {
      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=user_not_found`
      );
    }

    const currentUserId = user.parentId ?? user.id;

    // ── Verify state user ───────────────────────────────────────────────────
    if (currentUserId !== stateData.userId) {
      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=user_mismatch`
      );
    }

    // ── Exchange token ──────────────────────────────────────────────────────
    const tokenData = await exchangeCodeForToken(shop, code);

    if (!tokenData?.accessToken) {
      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=token_exchange_failed`
      );
    }

    // ── Fetch shop info ─────────────────────────────────────────────────────
    const shopInfo = await fetchShopifyShopInfo(
      shop,
      tokenData.accessToken
    );

    if (!shopInfo) {
      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=shop_info_failed`
      );
    }

    // ── Save store ──────────────────────────────────────────────────────────
    const saveResult = await saveShopifyStore(
      currentUserId,
      shop,
      tokenData.accessToken,
      tokenData.scope
    );

    if (!saveResult.success) {
      console.error(saveResult.error);

      return NextResponse.redirect(
        `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=save_failed`
      );
    }

    // ── Register webhooks ───────────────────────────────────────────────────
    const webhookResult = await registerShopifyWebhooks(
      shop,
      tokenData.accessToken
    );

    if (!webhookResult.success) {
      console.warn(
        "[Shopify Webhooks]",
        webhookResult.error
      );
    }

    console.log(
      `[Shopify Callback] Connected: ${shop}`
    );

    // ── Success ─────────────────────────────────────────────────────────────
    return NextResponse.redirect(
      `${process.env.SHOPIFY_APP_URL}/dashboard/api?success=true&shop=${encodeURIComponent(
        shop
      )}`
    );
  } catch (error) {
    console.error("[Shopify Callback] Error:", error);

    return NextResponse.redirect(
      `${process.env.SHOPIFY_APP_URL}/dashboard/api?error=unexpected`
    );
  }
}