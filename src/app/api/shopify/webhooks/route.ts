// src/app/api/shopify/webhooks/route.ts
// ─── ويب هوك Shopify — نظام uid+token زي EasyOrders ─────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";
import {
  type ShopifyOrder,
  type ShopifyCustomer,
  isShopifyOrder,
  isShopifyCustomer,
} from "@/types/shopify";
import { triggerStoreAutomation } from "@/lib/store-automation";

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

    const topic = req.headers.get("X-Shopify-Topic")
                ?? req.headers.get("x-shopify-topic")
                ?? "";

    let payload: unknown;
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
        if (isShopifyOrder(payload)) {
          await handleOrderCreated(payload, userId, shopifyStore.id);
        } else {
          console.warn("[Shopify WH] orders/create — invalid payload shape");
        }
        break;

      case "orders/updated":
        if (isShopifyOrder(payload)) {
          await handleOrderUpdated(payload, userId, shopifyStore.id);
        }
        break;

      case "orders/fulfilled":
        if (isShopifyOrder(payload)) {
          await handleOrderFulfilled(payload, userId, shopifyStore.id);
        }
        break;

      case "customers/create":
        if (isShopifyCustomer(payload)) {
          await handleCustomerCreated(payload, userId);
        }
        break;

      case "customers/update":
        if (isShopifyCustomer(payload)) {
          await handleCustomerUpdated(payload, userId);
        }
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

async function handleOrderCreated(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    const rawPhone: string =
      order.customer?.phone       ??
      order.billing_address?.phone ??
      order.phone                 ?? "";

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
        contactId:     contact.id,
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
        orderNumber:   order.order_number ?? null,
        totalPrice:    order.total_price  ?? null,
        customerName,
        customerEmail: order.customer?.email ?? null,
        customerPhone: cleanPhone,
        shopifyStoreId,
      },
    });

    // تحديث عداد المزامنة
    await prisma.shopifyStore.update({
      where: { id: shopifyStoreId },
      data:  { updatedAt: new Date() },
    });

    // ── أتمتة تأكيد الأوردر: بيبعت قالب ميتا مع متغيرات الأوردر الحقيقية ──
    await triggerStoreAutomation({
      userId,
      automationType: "order_confirm",
      storeSource:    "shopify",
      storeId:        shopifyStoreId,
      customerPhone:  cleanPhone,
      contactId:      contact.id,
      // {{1}} اسم العميل  {{2}} رقم الأوردر  {{3}} الإجمالي
      // اليوزر يرتّب القالب في ميتا بنفس الترتيب ده
      templateVars: {
        body: [
          customerName,
          String(order.order_number ?? order.id),
          String(order.total_price ?? ""),
        ],
      },
    });

    console.log(`[Shopify] ✓ Order #${order.order_number} — ${cleanPhone}`);
  } catch (error) {
    console.error("[Shopify] handleOrderCreated error:", error);
  }
}

async function handleOrderUpdated(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: order.financial_status ?? "pending" },
    });

    if (order.fulfillment_status === "fulfilled") {
      const rawPhone = order.customer?.phone ?? order.billing_address?.phone ?? "";
      if (!rawPhone) return;

      // نجيب أول tracking URL من أول fulfillment
      const trackingUrl: string | null =
        order.fulfillments
          ?.flatMap(f => f.tracking_urls ?? (f.tracking_url ? [f.tracking_url] : []))
          ?.[0] ?? null;

      await inngest.send({
        name: "shopify/order.fulfilled",
        data: {
          userId,
          orderId:           order.id,
          orderNumber:       order.order_number ?? null,
          customerPhone:     rawPhone.replace(/\D/g, ""),
          trackingUrl,
          fulfillmentStatus: order.fulfillment_status,
          shopifyStoreId,
        },
      });
    }
  } catch (error) {
    console.error("[Shopify] handleOrderUpdated error:", error);
  }
}

async function handleOrderFulfilled(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    const rawPhone = order.customer?.phone ?? order.billing_address?.phone ?? "";
    if (!rawPhone) return;

    const cleanPhone = rawPhone.replace(/\D/g, "");

    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: "fulfilled" },
    });

    const trackingUrl: string | null =
      order.fulfillments
        ?.flatMap(f => f.tracking_urls ?? (f.tracking_url ? [f.tracking_url] : []))
        ?.[0] ?? null;

    await inngest.send({
      name: "shopify/order.fulfilled",
      data: {
        userId,
        orderId:           order.id,
        orderNumber:       order.order_number ?? null,
        customerPhone:     cleanPhone,
        trackingUrl,
        fulfillmentStatus: order.fulfillment_status ?? null,
        shopifyStoreId,
      },
    });

    // ── أتمتة تحديث الشحن: بعت قالب واتساب فوراً لو الأتمتة متفعّلة ──────
    const contact = await prisma.contact.findFirst({
      where:  { phone: cleanPhone, userId },
      select: { id: true },
    });
    if (contact) {
      // ── أتمتة تحديث الشحن: بيبعت قالب ميتا مع رقم الأوردر ورابط التتبع ──
      await triggerStoreAutomation({
        userId,
        automationType: "order_shipped",
        storeSource:    "shopify",
        storeId:        shopifyStoreId,
        customerPhone:  cleanPhone,
        contactId:      contact.id,
        // {{1}} رقم الأوردر  {{2}} رابط التتبع
        templateVars: {
          body: [
            String(order.order_number ?? order.id),
            trackingUrl ?? "—",
          ],
        },
      });
    }
  } catch (error) {
    console.error("[Shopify] handleOrderFulfilled error:", error);
  }
}

async function handleCustomerCreated(customer: ShopifyCustomer, userId: string) {
  try {
    const phone = customer.phone ?? customer.default_address?.phone;
    if (!phone) return;

    const cleanPhone = phone.replace(/\D/g, "");
    await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: {},
      create: {
        phone:  cleanPhone,
        userId,
        name:   customer.first_name ?? "عميل",
      },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerCreated error:", error);
  }
}

async function handleCustomerUpdated(customer: ShopifyCustomer, userId: string) {
  try {
    const phone = customer.phone ?? customer.default_address?.phone;
    if (!phone) return;

    await prisma.contact.updateMany({
      where: { phone: phone.replace(/\D/g, ""), userId },
      data:  { name: customer.first_name ?? undefined },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerUpdated error:", error);
  }
}