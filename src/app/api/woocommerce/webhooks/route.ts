// src/app/api/woocommerce/webhooks/route.ts
// ─── استقبال Webhooks من WooCommerce — token-based auth ──────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";
import { Prisma } from "@prisma/client";
import {
  type WooOrder,
  type WooCustomer,
  type WooCoupon,
  isWooOrder,
  isWooCustomer,
  isWooCoupon,
  extractWooTracking,
} from "@/types/woocommerce";
import { OrderSource } from "@/types/enums";

function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(`woo:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "WooCommerce Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth بـ uid + token ──────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[WooCommerce WH] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.wooCommerceStore.findUnique({
      where:  { userId },
      select: { id: true, userId: true },
    });

    if (!store) {
      console.warn("[WooCommerce WH] Store not found for userId:", userId);
      return NextResponse.json({ status: "ignored" });
    }

    let payload: unknown;
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const topic = req.headers.get("x-wc-webhook-topic") ?? "";
    console.log(`[WooCommerce WH] ${topic} — userId: ${userId}`);

    // ── Route by topic ────────────────────────────────────────────────────────
    if (topic === "order.created") {
      if (isWooOrder(payload)) {
        await handleOrderCreated(payload, store.userId, store.id);
      } else {
        console.warn("[WooCommerce WH] order.created — invalid payload shape");
      }
    } else if (topic === "order.updated") {
      if (isWooOrder(payload)) {
        await handleOrderUpdated(payload, store.userId, store.id);
      }
    } else if (topic === "order.deleted") {
      if (isWooOrder(payload)) {
        await handleOrderDeleted(payload, store.userId);
      }
    } else if (topic.startsWith("coupon.")) {
      if (isWooCoupon(payload)) {
        await handleCoupon(payload, store.userId, topic);
      }
    } else {
      console.log(`[WooCommerce WH] Unhandled topic: ${topic}`);
    }

    // تحديث lastSyncAt
    await prisma.wooCommerceStore.update({
      where: { id: store.id },
      data:  { lastSyncAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("[WooCommerce WH] Unexpected error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Created
// ═══════════════════════════════════════════════════════════════════════════════
async function handleOrderCreated(
  order: WooOrder,
  userId: string,
  woocommerceStoreId: string,
) {
  try {
    const rawPhone = order.billing?.phone ?? order.shipping?.phone ?? "";
    if (!rawPhone) {
      console.warn(`[WooCommerce] Order ${order.id} — no phone`);
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) return;

    const customerName = [order.billing?.first_name, order.billing?.last_name]
      .filter(Boolean).join(" ") || "عميل";
    const revenue    = parseFloat(order.total ?? "0") || 0;
    const externalId = String(order.id);

    // استخراج كودات الكوبون — typed بدل (c: any)
    const couponCodes: string[] = (order.coupon_lines ?? [])
      .map(c => c.code)
      .filter((code): code is string => Boolean(code));

    // ── Upsert Contact ───────────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "عميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // ── Upsert StoreOrder ────────────────────────────────────────────────────
    const storeOrder = await prisma.storeOrder.upsert({
      where: {
        source_externalId_userId: {
          source:     OrderSource.woocommerce,
          externalId,
          userId,
        },
      },
      update: { status: order.status ?? "pending" },
      create: {
        userId,
        source:             OrderSource.woocommerce,
        externalId,
        orderNumber:        String(order.number ?? order.id),
        customerName,
        customerPhone:      cleanPhone,
        total:              revenue,
        currency:           order.currency ?? "EGP",
        status:             order.status ?? "pending",
        contactId:          contact.id,
        wooCommerceStoreId: woocommerceStoreId,
        rawData: (couponCodes.length ? { couponCodes } : order) as Prisma.InputJsonValue,
        orderedAt:          order.date_created ? new Date(order.date_created) : new Date(),
      },
    });

    await prisma.wooCommerceStore.update({
      where: { id: woocommerceStoreId },
      data:  { totalSynced: { increment: 1 } },
    }).catch(() => {});

    // ── Attribution ──────────────────────────────────────────────────────────
    await attributeOrderToCampaign({
      userId,
      customerPhone: cleanPhone,
      storeOrderId:  storeOrder.id,
      revenue,
    });

    // ── Inngest ──────────────────────────────────────────────────────────────
    await inngest.send({
      name: "woocommerce/order.created",
      data: {
        userId,
        contactId:          contact.id,
        orderId:            order.id,
        orderNumber:        order.number ?? null,
        totalPrice:         order.total   ?? null,
        currency:           order.currency ?? null,
        customerName,
        customerEmail:      order.billing?.email ?? null,
        customerPhone:      cleanPhone,
        woocommerceStoreId,
        couponCodes,
      },
    });

  } catch (err) {
    console.error("[WooCommerce] handleOrderCreated error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Updated — تحديث الحالة + الشحن لو completed
// ═══════════════════════════════════════════════════════════════════════════════
async function handleOrderUpdated(
  order: WooOrder,
  userId: string,
  woocommerceStoreId: string,
) {
  try {
    const externalId = String(order.id);
    const status     = order.status ?? "updated";

    await prisma.storeOrder.updateMany({
      where: { userId, source: OrderSource.woocommerce, externalId },
      data:  { status },
    });

    // لو اتشحن (completed) → استخرج الـ tracking واعمل fulfilled event
    if (status === "completed") {
      const rawPhone   = order.billing?.phone ?? order.shipping?.phone ?? "";
      const cleanPhone = rawPhone.replace(/\D/g, "");

      // extractWooTracking بيجيب الـ tracking من meta_data بشكل typed
      const { trackingUrl, trackingNumber, shippingProvider } =
        extractWooTracking(order.meta_data);

      // fallback: لو مفيش tracking في meta → جرّب shipping_lines
      const provider = shippingProvider
        ?? order.shipping_lines?.[0]?.method_title
        ?? null;

      await inngest.send({
        name: "woocommerce/order.fulfilled",
        data: {
          userId,
          orderId:          order.id,
          orderNumber:      order.number ?? null,
          customerPhone:    cleanPhone,
          trackingUrl,
          trackingNumber,
          shippingProvider: provider,
          woocommerceStoreId,
        },
      });
    }

    await inngest.send({
      name: "woocommerce/order.updated",
      data: {
        userId,
        orderId:     order.id,
        orderNumber: order.number ?? null,
        status,
        woocommerceStoreId,
      },
    });

  } catch (err) {
    console.error("[WooCommerce] handleOrderUpdated error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Deleted — تنظيف
// ═══════════════════════════════════════════════════════════════════════════════
async function handleOrderDeleted(order: WooOrder, userId: string) {
  try {
    await prisma.storeOrder.updateMany({
      where: { userId, source: OrderSource.woocommerce, externalId: String(order.id) },
      data:  { status: "cancelled" },
    });
  } catch (err) {
    console.error("[WooCommerce] handleOrderDeleted error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Coupon — تسجيل العروض الجديدة
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCoupon(coupon: WooCoupon, userId: string, topic: string) {
  try {
    console.log(
      `[WooCommerce] Coupon ${topic}: code="${coupon.code}" discount="${coupon.discount_type}:${coupon.amount}"`
    );

    await inngest.send({
      name: "woocommerce/coupon.event",
      data: {
        userId,
        topic,
        couponId:     coupon.id,
        code:         coupon.code         ?? null,
        discountType: coupon.discount_type ?? null,
        amount:       coupon.amount        ?? null,
        expiryDate:   coupon.date_expires  ?? null,
        usageCount:   coupon.usage_count   ?? 0,
        usageLimit:   coupon.usage_limit   ?? null,
      },
    });
  } catch (err) {
    console.error("[WooCommerce] handleCoupon error:", err);
  }
}