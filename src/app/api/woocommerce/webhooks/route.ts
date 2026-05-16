// src/app/api/woocommerce/webhooks/route.ts
// ─── استقبال Webhooks من WooCommerce — token-based auth ──────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";

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

    let payload: any;
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const topic = req.headers.get("x-wc-webhook-topic") || "";
    console.log(`[WooCommerce WH] ${topic} — userId: ${userId}`);

    // ── Route by topic ────────────────────────────────────────────────────────
    if (topic === "order.created") {
      await handleOrderCreated(payload, store.userId, store.id);
    } else if (topic === "order.updated") {
      await handleOrderUpdated(payload, store.userId, store.id);
    } else if (topic === "order.deleted") {
      await handleOrderDeleted(payload, store.userId);
    } else if (topic.startsWith("coupon.")) {
      await handleCoupon(payload, store.userId, topic);
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
async function handleOrderCreated(order: any, userId: string, woocommerceStoreId: string) {
  try {
    const rawPhone = order.billing?.phone || order.shipping?.phone || "";
    if (!rawPhone) {
      console.warn(`[WooCommerce] Order ${order.id} — no phone`);
      return;
    }

    const cleanPhone   = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) return;

    const customerName = [order.billing?.first_name, order.billing?.last_name]
      .filter(Boolean).join(" ") || "عميل";
    const revenue      = parseFloat(order.total ?? "0") || 0;
    const externalId   = String(order.id);

    // استخراج كودات الكوبون
    const couponCodes: string[] = (order.coupon_lines ?? [])
      .map((c: any) => c.code)
      .filter(Boolean);

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
          source: "woocommerce" as any,
          externalId,
          userId,
        },
      },
      update: { status: order.status ?? "pending" },
      create: {
        userId,
        source:             "woocommerce" as any,
        externalId,
        orderNumber:        String(order.number ?? order.id),
        customerName,
        customerPhone:      cleanPhone,
        total:              revenue,
        currency:           order.currency ?? "EGP",
        status:             order.status ?? "pending",
        contactId:          contact.id,
        wooCommerceStoreId: woocommerceStoreId,
        rawData:            couponCodes.length ? { couponCodes } : order,
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
        orderNumber:        order.number,
        totalPrice:         order.total,
        currency:           order.currency,
        customerName,
        customerEmail:      order.billing?.email,
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
async function handleOrderUpdated(order: any, userId: string, woocommerceStoreId: string) {
  try {
    const externalId = String(order.id);
    const status     = order.status ?? "updated";

    // تحديث الحالة في الـ DB
    await prisma.storeOrder.updateMany({
      where: { userId, source: "woocommerce" as any, externalId },
      data:  { status },
    });

    // ── لو اتشحن (completed) → استخرج الـ tracking واعمل fulfilled event ──
    if (status === "completed") {
      const rawPhone = order.billing?.phone || order.shipping?.phone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");

      // WooCommerce بيحط shipping في meta_data أو في shipment plugins
      const trackingUrl: string | null =
        order.meta_data?.find((m: any) => m.key === "_wc_shipment_tracking_url")?.value ??
        order.meta_data?.find((m: any) => m.key === "tracking_url")?.value ??
        null;

      const trackingNumber: string | null =
        order.meta_data?.find((m: any) => m.key === "_wc_shipment_tracking_number")?.value ??
        order.meta_data?.find((m: any) => m.key === "tracking_number")?.value ??
        null;

      const shippingProvider: string | null =
        order.meta_data?.find((m: any) => m.key === "_wc_shipment_tracking_provider")?.value ??
        order.shipping_lines?.[0]?.method_title ??
        null;

      await inngest.send({
        name: "woocommerce/order.fulfilled",
        data: {
          userId,
          orderId:          order.id,
          orderNumber:      order.number,
          customerPhone:    cleanPhone,
          trackingUrl,
          trackingNumber,
          shippingProvider,
          woocommerceStoreId,
        },
      });
    }

    // Inngest event للـ order updated
    await inngest.send({
      name: "woocommerce/order.updated",
      data: {
        userId,
        orderId:     order.id,
        orderNumber: order.number,
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
async function handleOrderDeleted(order: any, userId: string) {
  try {
    await prisma.storeOrder.updateMany({
      where: { userId, source: "woocommerce" as any, externalId: String(order.id) },
      data:  { status: "cancelled" },
    });
  } catch (err) {
    console.error("[WooCommerce] handleOrderDeleted error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Coupon — تسجيل العروض الجديدة
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCoupon(coupon: any, userId: string, topic: string) {
  try {
    // بنسجل في الـ log بس — الـ automation بيتحكم فيها من صفحة الأتمتة
    console.log(`[WooCommerce] Coupon ${topic}: code="${coupon.code}" discount="${coupon.discount_type}:${coupon.amount}"`);

    // لو عاوز تشيل الكوبون للـ DB في الـ مستقبل
    // await prisma.storePromotion.upsert(...)

    await inngest.send({
      name: "woocommerce/coupon.event",
      data: {
        userId,
        topic,
        couponId:     coupon.id,
        code:         coupon.code,
        discountType: coupon.discount_type,  // percent / fixed_cart / fixed_product
        amount:       coupon.amount,
        expiryDate:   coupon.date_expires,
        usageCount:   coupon.usage_count,
        usageLimit:   coupon.usage_limit,
      },
    });
  } catch (err) {
    console.error("[WooCommerce] handleCoupon error:", err);
  }
}