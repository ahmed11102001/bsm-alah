import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyShopifyWebhookSignature } from "@/lib/shopify";
import { inngest } from "@/inngest/client";

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
    // ── Step 1: Get raw body for signature verification ──────────────────────
    const rawBody = await req.text();

    // ── Step 2: Extract headers ──────────────────────────────────────────────
    const hmacHeader = req.headers.get("X-Shopify-Hmac-SHA256") || "";
    const shopId = req.headers.get("X-Shopify-Shop-Id") || "";
    const topic = req.headers.get("X-Shopify-Topic") || "";

    // ── Step 3: Verify webhook signature ─────────────────────────────────────
    const isValid = await verifyShopifyWebhookSignature(rawBody, hmacHeader);

    if (!isValid) {
      console.warn("[Shopify Webhook] Invalid signature - rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── Step 4: Parse webhook payload ────────────────────────────────────────
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("[Shopify Webhook] Failed to parse JSON:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── Step 5: Find the Shopify store in database ───────────────────────────
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { shop: payload.shop?.myshopify_domain || shopId },
      select: { userId: true, shop: true },
    });

    if (!shopifyStore) {
      console.warn(
        `[Shopify Webhook] Store not found for shop: ${payload.shop?.myshopify_domain || shopId}`
      );
      return NextResponse.json({ status: "ignored" });
    }

    const userId = shopifyStore.userId;

    // ── Step 6: Route webhook based on topic ─────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleOrderCreated(order: any, userId: string) {
  try {
    console.log(`[Shopify] Order created: ${order.id}`);

    // Get customer phone number
    const customerPhone = order.customer?.phone || order.billing_address?.phone;

    if (!customerPhone) {
      console.warn(`[Shopify] Order ${order.id} has no customer phone`);
      return;
    }

    // Upsert contact
    const contact = await prisma.contact.upsert({
      where: {
        phone_userId: {
          phone: customerPhone.replace(/\D/g, ""),
          userId,
        },
      },
      update: {
        name: order.customer?.first_name || "عميل جديد",
      },
      create: {
        phone: customerPhone.replace(/\D/g, ""),
        userId,
        name: order.customer?.first_name || "عميل جديد",
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

    const customerPhone = order.customer?.phone || order.billing_address?.phone;

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

    const customerPhone = order.customer?.phone || order.billing_address?.phone;

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

    const phone = customer.phone || customer.default_address?.phone;

    if (!phone) {
      console.warn(`[Shopify] Customer ${customer.id} has no phone`);
      return;
    }

    // Upsert contact
    await prisma.contact.upsert({
      where: {
        phone_userId: {
          phone: phone.replace(/\D/g, ""),
          userId,
        },
      },
      update: {},
      create: {
        phone: phone.replace(/\D/g, ""),
        userId,
        name: customer.first_name || "عميل جديد",
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

    const phone = customer.phone || customer.default_address?.phone;

    if (!phone) {
      return;
    }

    // Update contact
    await prisma.contact.updateMany({
      where: {
        phone: phone.replace(/\D/g, ""),
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
