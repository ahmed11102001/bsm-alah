// src/app/api/shopify/webhooks/route.ts
// ─── ويب هوك Shopify — نظام uid+token زي EasyOrders ─────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";

// ── Token helper — نفس WooCommerce و EasyOrders ───────────────────────────────
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateShopifyWebhookUrl(userId: string): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(userId);
  return `${base}/api/shopify/webhooks?uid=${userId}&token=${token}`;
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "Shopify Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth بـ uid + token ───────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[Shopify WH] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topic = req.headers.get("X-Shopify-Topic") || req.headers.get("x-shopify-topic") || "";

    let payload: any;
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // ── جيب المتجر ───────────────────────────────────────────────────────────
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: { id: true, userId: true, shop: true },
    });

    if (!shopifyStore) {
      console.warn(`[Shopify WH] Store not found for userId: ${userId}`);
      return NextResponse.json({ status: "ignored" });
    }

    console.log(`[Shopify WH] ${topic || "order"} — store: ${shopifyStore.shop}`);

    // ── Route by topic ────────────────────────────────────────────────────────
    switch (topic) {
      case "orders/create":
      case "":   // لو مفيش topic بيتعامل معاه كـ order created
        await handleOrderCreated(payload, userId, shopifyStore.id);
        break;
      case "orders/updated":
        await handleOrderUpdated(payload, userId, shopifyStore.id);
        break;
      case "orders/fulfilled":
        await handleOrderFulfilled(payload, userId, shopifyStore.id);
        break;
      case "customers/create":
        await handleCustomerCreated(payload, userId);
        break;
      case "customers/update":
        await handleCustomerUpdated(payload, userId);
        break;
      default:
        console.log(`[Shopify WH] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[Shopify WH] Unexpected error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleOrderCreated(order: any, userId: string, shopifyStoreId: string) {
  try {
    const rawPhone: string =
      order.customer?.phone      ||
      order.billing_address?.phone ||
      order.phone                || "";

    if (!rawPhone) {
      console.warn(`[Shopify] Order ${order.id} — no phone, skipping`);
      return;
    }

    const cleanPhone   = rawPhone.replace(/\D/g, "");
    const customerName = [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean).join(" ") || "عميل";
    const revenue    = parseFloat(order.total_price ?? "0") || 0;
    const externalId = String(order.id);

    // Upsert Contact
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "عميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // حفظ StoreOrder
    const storeOrder = await prisma.storeOrder.upsert({
      where:  { source_externalId_userId: { source: "shopify", externalId, userId } },
      update: { status: order.financial_status ?? "pending", total: revenue },
      create: {
        userId,
        source:        "shopify",
        externalId,
        orderNumber:   String(order.order_number ?? order.id),
        customerPhone: cleanPhone,
        customerName,
        total:         revenue,
        currency:      order.currency ?? "EGP",
        status:        order.financial_status ?? "pending",
        shopifyStoreId,
        orderedAt:     order.created_at ? new Date(order.created_at) : new Date(),
      },
    });

    // Revenue Attribution
    await attributeOrderToCampaign({
      userId,
      customerPhone: cleanPhone,
      storeOrderId:  storeOrder.id,
      revenue,
    });

    // Inngest → أتمتة تأكيد الأوردر
    await inngest.send({
      name: "shopify/order.created",
      data: {
        userId,
        contactId:     contact.id,
        orderId:       order.id,
        orderNumber:   order.order_number,
        totalPrice:    order.total_price,
        customerName,
        customerEmail: order.customer?.email,
        customerPhone: cleanPhone,
        shopifyStoreId,
      },
    });

    // تحديث عداد المزامنة
    await prisma.shopifyStore.update({
      where: { id: shopifyStoreId },
      data:  { updatedAt: new Date() },
    });

    console.log(`[Shopify] ✓ Order #${order.order_number} — ${cleanPhone}`);
  } catch (error) {
    console.error("[Shopify] handleOrderCreated error:", error);
  }
}

async function handleOrderUpdated(order: any, userId: string, shopifyStoreId: string) {
  try {
    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: order.financial_status ?? "pending" },
    });

    if (order.fulfillment_status === "fulfilled") {
      const rawPhone = order.customer?.phone || order.billing_address?.phone || "";
      if (!rawPhone) return;
      await inngest.send({
        name: "shopify/order.fulfilled",
        data: {
          userId,
          orderId:           order.id,
          orderNumber:       order.order_number,
          customerPhone:     rawPhone.replace(/\D/g, ""),
          trackingUrl:       order.fulfillments?.[0]?.tracking_url ?? null,
          fulfillmentStatus: order.fulfillment_status,
          shopifyStoreId,
        },
      });
    }
  } catch (error) {
    console.error("[Shopify] handleOrderUpdated error:", error);
  }
}

async function handleOrderFulfilled(order: any, userId: string, shopifyStoreId: string) {
  try {
    const rawPhone = order.customer?.phone || order.billing_address?.phone || "";
    if (!rawPhone) return;

    const cleanPhone = rawPhone.replace(/\D/g, "");

    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: "fulfilled" },
    });

    const trackingUrl: string | null =
      order.fulfillments
        ?.flatMap((f: any) => f.tracking_urls ?? [f.tracking_url].filter(Boolean))
        ?.[0] ?? null;

    await inngest.send({
      name: "shopify/order.fulfilled",
      data: {
        userId,
        orderId:           order.id,
        orderNumber:       order.order_number,
        customerPhone:     cleanPhone,
        trackingUrl,
        fulfillmentStatus: order.fulfillment_status,
        shopifyStoreId,
      },
    });
  } catch (error) {
    console.error("[Shopify] handleOrderFulfilled error:", error);
  }
}

async function handleCustomerCreated(customer: any, userId: string) {
  try {
    const phone = customer.phone || customer.default_address?.phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: {},
      create: { phone: cleanPhone, userId, name: customer.first_name || "عميل" },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerCreated error:", error);
  }
}

async function handleCustomerUpdated(customer: any, userId: string) {
  try {
    const phone = customer.phone || customer.default_address?.phone;
    if (!phone) return;
    await prisma.contact.updateMany({
      where: { phone: phone.replace(/\D/g, ""), userId },
      data:  { name: customer.first_name || undefined },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerUpdated error:", error);
  }
}