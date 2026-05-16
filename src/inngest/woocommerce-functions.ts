// src/inngest/woocommerce-functions.ts
// ─── Inngest functions لأحداث WooCommerce ─────────────────────────────────────

import { inngest } from "./client";
import prisma      from "@/lib/prisma";

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Order Created — حفظ الأوردر + Contact + كوبون لو موجود
// ═══════════════════════════════════════════════════════════════════════════════
export const handleWooOrderCreated = inngest.createFunction(
  { id: "woo-order-created", retries: 2, triggers: [{ event: "woocommerce/order.created" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId, orderId, orderNumber, totalPrice, currency,
      customerName, customerPhone, customerEmail,
      woocommerceStoreId, couponCodes,
    } = event.data;

    if (!customerPhone) {
      console.warn(`[WooCommerce] Order ${orderNumber} — no phone`);
      return { skipped: true, reason: "no_phone" };
    }

    const phone = cleanPhone(customerPhone);

    // ── Step 1: Upsert Contact ─────────────────────────────────────────────
    const contact = await step.run("upsert-contact", async () => {
      return prisma.contact.upsert({
        where:  { phone_userId: { phone, userId } },
        update: { name: customerName || undefined },
        create: { phone, userId, name: customerName || "عميل WooCommerce" },
      });
    });

    // ── Step 2: Save StoreOrder ────────────────────────────────────────────
    const order = await step.run("save-order", async () => {
      return prisma.storeOrder.upsert({
        where: {
          source_externalId_userId: {
            userId,
            source:     "woocommerce",
            externalId: String(orderId),
          },
        },
        update: { status: "pending" },
        create: {
          userId,
          source:             "woocommerce",
          externalId:         String(orderId),
          orderNumber:        orderNumber ? String(orderNumber) : undefined,
          customerName,
          customerPhone:      phone,
          total:              totalPrice != null ? Number(totalPrice) : undefined,
          currency:           currency || "EGP",
          status:             "pending",
          contactId:          contact.id,
          wooCommerceStoreId: woocommerceStoreId,
          rawData: couponCodes?.length
            ? { couponCodes }
            : undefined,
        },
      });
    });

    console.log(`[WooCommerce] ✓ Order #${orderNumber} saved — contact: ${contact.id}${couponCodes?.length ? ` — كوبون: ${couponCodes.join(",")}` : ""}`);
    return { success: true, orderId: order.id, contactId: contact.id };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Order Fulfilled (completed) — تحديث حالة الشحن + Tracking
// ═══════════════════════════════════════════════════════════════════════════════
export const handleWooOrderFulfilled = inngest.createFunction(
  { id: "woo-order-fulfilled", retries: 2, triggers: [{ event: "woocommerce/order.fulfilled" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, trackingUrl, trackingNumber, shippingProvider } = event.data;

    await step.run("update-order-fulfilled", async () => {
      await prisma.storeOrder.updateMany({
        where: { userId, source: "woocommerce", externalId: String(orderId) },
        data: {
          status:  "fulfilled",
          rawData: (trackingUrl || trackingNumber)
            ? { trackingUrl, trackingNumber, shippingProvider }
            : undefined,
        },
      });
    });

    console.log(`[WooCommerce] ✓ Order #${orderNumber} fulfilled${trackingUrl ? ` — tracking: ${trackingUrl}` : ""}`);
    return { success: true };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Order Updated — تحديث الحالة العامة
// ═══════════════════════════════════════════════════════════════════════════════
export const handleWooOrderUpdated = inngest.createFunction(
  { id: "woo-order-updated", retries: 2, triggers: [{ event: "woocommerce/order.updated" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, status } = event.data;

    await step.run("update-order-status", async () => {
      await prisma.storeOrder.updateMany({
        where: { userId, source: "woocommerce", externalId: String(orderId) },
        data:  { status: status || "updated" },
      });
    });

    // لو اتشحن → بعت fulfilled event
    if (status === "completed") {
      await inngest.send({ name: "woocommerce/order.fulfilled", data: event.data });
    }

    console.log(`[WooCommerce] ✓ Order #${orderNumber} → ${status}`);
    return { processed: true };
  }
);