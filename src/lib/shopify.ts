import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Shopify OAuth Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || "http://localhost:3000/api/shopify/callback";
const SHOPIFY_SCOPES = [
  "write_orders",
  "read_orders",
  "write_customers",
  "read_customers",
  "write_fulfillments",
  "read_fulfillments",
  "write_products",
  "read_products",
].join(",");

// ─────────────────────────────────────────────────────────────────────────────
// 1. Generate OAuth Authorization URL
// ─────────────────────────────────────────────────────────────────────────────

export function generateShopifyAuthUrl(shop: string, state: string): string {
  const normalizedShop = shop.includes("myshopify.com")
    ? shop
    : `${shop}.myshopify.com`;

  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state,
  });

  return `https://${normalizedShop}/admin/oauth/authorize?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Verify HMAC Signature from Shopify
// ─────────────────────────────────────────────────────────────────────────────

export function verifyShopifyHmac(
  query: Record<string, string | string[]>,
  hmac: string
): boolean {
  // Create a copy without the hmac parameter
  const queryWithoutHmac = { ...query };
  delete queryWithoutHmac.hmac;

  // Sort and encode the query parameters
  const encoded = Object.keys(queryWithoutHmac)
    .sort()
    .map((key) => {
      const value = queryWithoutHmac[key];
      const val = Array.isArray(value) ? value[0] : value;
      return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    })
    .join("&");

  // Generate the expected HMAC
  const generated = createHmac("sha256", SHOPIFY_API_SECRET)
    .update(encoded, "utf8")
    .digest("base64");

  return generated === hmac;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Exchange Authorization Code for Access Token
// ─────────────────────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string } | null> {
  const normalizedShop = shop.includes("myshopify.com")
    ? shop
    : `${shop}.myshopify.com`;

  try {
    const response = await fetch(`https://${normalizedShop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!response.ok) {
      console.error("[Shopify OAuth] Token exchange failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      scope: data.scope,
    };
  } catch (error) {
    console.error("[Shopify OAuth] Error exchanging code:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Save Shopify Store to Database
// ─────────────────────────────────────────────────────────────────────────────

export async function saveShopifyStore(
  userId: string,
  shop: string,
  accessToken: string,
  scope: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedShop = shop.includes("myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    await prisma.shopifyStore.upsert({
      where: { userId },
      update: {
        shop: normalizedShop,
        accessToken,
        scope,
      },
      create: {
        userId,
        shop: normalizedShop,
        accessToken,
        scope,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Shopify] Error saving store:", error);
    return {
      success: false,
      error: "فشل حفظ بيانات المتجر",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Get Shopify Store by User ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getShopifyStore(userId: string) {
  try {
    return await prisma.shopifyStore.findUnique({
      where: { userId },
    });
  } catch (error) {
    console.error("[Shopify] Error fetching store:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Fetch Shopify Shop Information
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShopifyShopInfo(
  shop: string,
  accessToken: string
): Promise<{ name: string; email: string; phone: string } | null> {
  const normalizedShop = shop.includes("myshopify.com")
    ? shop
    : `${shop}.myshopify.com`;

  try {
    const response = await fetch(`https://${normalizedShop}/admin/api/2024-01/shop.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("[Shopify API] Failed to fetch shop info:", response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      name: data.shop.name,
      email: data.shop.email,
      phone: data.shop.phone || "",
    };
  } catch (error) {
    console.error("[Shopify API] Error fetching shop info:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Register Webhooks with Shopify
// ─────────────────────────────────────────────────────────────────────────────

export async function registerShopifyWebhooks(
  shop: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedShop = shop.includes("myshopify.com")
    ? shop
    : `${shop}.myshopify.com`;

  const webhookTopics = [
    "orders/create",
    "orders/updated",
    "orders/fulfilled",
    "customers/create",
    "customers/update",
  ];

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/shopify/webhooks`;

  try {
    for (const topic of webhookTopics) {
      const response = await fetch(
        `https://${normalizedShop}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(`[Shopify Webhooks] Failed to register ${topic}:`, response.statusText);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[Shopify Webhooks] Error registering webhooks:", error);
    return {
      success: false,
      error: "فشل تسجيل الويب هوكات",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Verify Shopify Webhook Signature
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyShopifyWebhookSignature(
  rawBody: string,
  hmacHeader: string
): Promise<boolean> {
  try {
    const hmac = createHmac("sha256", SHOPIFY_API_SECRET)
      .update(rawBody, "utf8")
      .digest("base64");

    return hmac === hmacHeader;
  } catch (error) {
    console.error("[Shopify Webhook] Error verifying signature:", error);
    return false;
  }
}
