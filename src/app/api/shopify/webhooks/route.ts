import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyShopifyWebhookSignature } from "@/lib/shopify";
import { inngest } from "@/inngest/client";
import { normalizePhone } from "@/lib/phone";

/**
 * POST /api/shopify/webhooks
 * 
 * Receives webhook events from Shopify.
 * Handles orders, customers, and fulfillment events.
 * 
 * Headers:
 * - X-Shopify-Hmac-SHA256: HMAC signature
 * - X-Shopify-Shop-Id: Shop ID
 * - X-Shopify-Topic: Webhook topic
 */
export async function POST(req: NextRequest) {
  try {
    // â”€â”€ Step 1: Get raw body for signature verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const rawBody = await req.text();

    // â”€â”€ Step 2: Extract headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const hmacHeader = req.headers.get("X-Shopify-Hmac-SHA256") || "";
    const shopId = req.headers.get("X-Shopify-Shop-Id") || "";
    const topic = req.headers.get("X-Shopify-Topic") || "";

    // â”€â”€ Step 3: Verify webhook signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const isValid = await verifyShopifyWebhookSignature(rawBody, hmacHeader);

    if (!isValid) {
      console.warn("[Shopify Webhook] Invalid signature - rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // â”€â”€ Step 4: Parse webhook payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("[Shopify Webhook] Failed to parse JSON:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // â”€â”€ Step 5: Find the Shopify store in database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Ø§Ù„Ù€ domain Ø¨ÙŠÙŠØ¬ÙŠ ÙÙŠ header X-Shopify-Shop-Domain â€” Ø£Ø¯Ù‚ Ù…Ù† Ø§Ù„Ù€ payload
    const shopDomain =
      req.headers.get("X-Shopify-Shop-Domain") ||
      req.headers.get("x-shopify-shop-domain") ||
      payload.shop?.myshopify_domain ||
      "";

    if (!shopDomain) {
      console.warn("[Shopify Webhook] No shop domain found in headers or payload");
      return NextResponse.json({ status: "ignored" });
    }

    const shopifyStore = await prisma.shopifyStore.findFirst({
      where:  { shop: shopDomain },
      select: { userId: true, shop: true },
    });

    if (!shopifyStore) {
      console.warn(`[Shopify Webhook] Store not found for domain: ${shopDomain}`);
      return NextResponse.json({ status: "ignored" });
    }

    const userId = shopifyStore.userId;

    // â”€â”€ Step 6: Route webhook based on topic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    console.log(`[Shopify Webhook] Received ${topic} for shop: ${shopifyStore.shop}`);

    switch (topic) {
      case "orders/create":
        await handleOrderCreated(payload, userId);
        break;

      case "orders/updated":
        await handleOrderUpdated(payload, userId);
        break;

      case "orders/fulfilled":
        await handleOrderFulfilled(payload, userId);
        break;

      case "customers/create":
        await handleCustomerCreated(payload, userId);
        break;

      case "customers/update":
        await handleCustomerUpdated(payload, userId);
        break;

      default:
        console.log(`[Shopify Webhook] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[Shopify Webhook] Error processing webhook:", error);
    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Webhook Handlers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function handleOrderCreated(order: any, userId: string) {
  try {
    console.log(`[Shopify] Order created: ${order.id}`);

    // Get customer phone number
    const customerPhoneRaw = order.customer?.phone || order.billing_address?.phone;
    const customerPhone = customerPhoneRaw ? normalizePhone(customerPhoneRaw) : null;

    if (!customerPhone) {
      console.warn(`[Shopify] Order ${order.id} has no customer phone`);
      return;
    }

    // Upsert contact
    const contact = await prisma.contact.upsert({
      where: {
        phone_userId: {
          phone: customerPhone,
          userId,
        },
      },
      update: {
        name: order.customer?.first_name || "Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯",
      },
      create: {
        phone: customerPhone,
        userId,
        name: order.customer?.first_name || "Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯",
      },
    });

    // Trigger Inngest event for order creation
    await inngest.send({
      name: "shopify/order.created",
      data: {
        userId,
        contactId: contact.id,
        orderId: order.id,
        orderNumber: order.order_number,
        totalPrice: order.total_price,
        customerName: order.customer?.first_name,
        customerEmail: order.customer?.email,
        customerPhone,
      },
    });
  } catch (error) {
    console.error("[Shopify] Error handling order created:", error);
  }
}

async function handleOrderUpdated(order: any, userId: string) {
  try {
    console.log(`[Shopify] Order updated: ${order.id}`);

    const customerPhoneRaw = order.customer?.phone || order.billing_address?.phone;
    const customerPhone = customerPhoneRaw ? normalizePhone(customerPhoneRaw) : null;

    if (!customerPhone) {
      return;
    }

    // Trigger Inngest event for order update
    await inngest.send({
      name: "shopify/order.updated",
      data: {
        userId,
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        customerPhone,
      },
    });
  } catch (error) {
    console.error("[Shopify] Error handling order updated:", error);
  }
}

async function handleOrderFulfilled(order: any, userId: string) {
  try {
    console.log(`[Shopify] Order fulfilled: ${order.id}`);

    const customerPhoneRaw = order.customer?.phone || order.billing_address?.phone;
    const customerPhone = customerPhoneRaw ? normalizePhone(customerPhoneRaw) : null;

    if (!customerPhone) {
      return;
    }

    // Get tracking information if available
    const fulfillments = order.fulfillments || [];
    const trackingInfo = fulfillments
      .flatMap((f: any) => f.tracking_info?.url || [])
      .filter(Boolean);

    // Trigger Inngest event for order fulfillment
    await inngest.send({
      name: "shopify/order.fulfilled",
      data: {
        userId,
        orderId: order.id,
        orderNumber: order.order_number,
        customerPhone,
        trackingUrl: trackingInfo[0] || null,
        fulfillmentStatus: order.fulfillment_status,
      },
    });
  } catch (error) {
    console.error("[Shopify] Error handling order fulfilled:", error);
  }
}

async function handleCustomerCreated(customer: any, userId: string) {
  try {
    console.log(`[Shopify] Customer created: ${customer.id}`);

    const phoneRaw = customer.phone || customer.default_address?.phone;
    const phoneNormalized = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (!phoneNormalized) {
      console.warn(`[Shopify] Customer ${customer.id} has no phone`);
      return;
    }

    // Upsert contact
    await prisma.contact.upsert({
      where: {
        phone_userId: {
          phone: phoneNormalized,
          userId,
        },
      },
      update: {},
      create: {
        phone: phoneNormalized,
        userId,
        name: customer.first_name || "Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯",
      },
    });

    console.log(`[Shopify] Customer ${customer.id} saved to contacts`);
  } catch (error) {
    console.error("[Shopify] Error handling customer created:", error);
  }
}

async function handleCustomerUpdated(customer: any, userId: string) {
  try {
    console.log(`[Shopify] Customer updated: ${customer.id}`);

    const phoneRaw = customer.phone || customer.default_address?.phone;
    const phoneNormalized = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (!phoneNormalized) {
      return;
    }

    // Update contact
    await prisma.contact.updateMany({
      where: {
        phone: phoneNormalized,
        userId,
      },
      data: {
        name: customer.first_name || undefined,
      },
    });
  } catch (error) {
    console.error("[Shopify] Error handling customer updated:", error);
  }
}

