// src/inngest/shopify-functions.ts
// ─── حفظ بيانات أوردرات Shopify فقط — بدون إرسال تلقائي ─────────────────────
// الإرسال بيحصل من صفحة الأتمتة عبر قوالب ميتا المعتمدة

import { inngest } from "./client";
import prisma from "@/lib/prisma";

// ─── Helper: تنظيف رقم الهاتف ───────────────────────────────────────────────
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Function 1: Order Created — حفظ الأوردر + الـ Contact
// ─────────────────────────────────────────────────────────────────────────────
export const handleShopifyOrderCreated = inngest.createFunction(
  {
    id:      "shopify-order-created",
    retries: 2,
    triggers: [{ event: "shopify/order.created" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      orderId,
      orderNumber,
      totalPrice,
      currency,
      customerName,
      customerPhone,
      rawData,
    } = event.data;

    if (!customerPhone) {
      console.warn(`[Shopify] Order ${orderNumber} has no phone — skipping`);
      return { skipped: true, reason: "no_phone" };
    }

    const phone = cleanPhone(customerPhone);

    // ── Step 1: Upsert Contact ─────────────────────────────────────────────
    const contact = await step.run("upsert-contact", async () => {
      return prisma.contact.upsert({
        where:  { phone_userId: { phone, userId } },
        update: { name: customerName || undefined },
        create: { phone, userId, name: customerName || "عميل شوبيفاي" },
      });
    });

    // ── Step 2: Save StoreOrder ────────────────────────────────────────────
    const order = await step.run("save-order", async () => {
      return prisma.storeOrder.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source:     "shopify",
            externalId: String(orderId),
          },
        },
        update: { status: "pending" },
        create: {
          userId,
          source:        "shopify",
          externalId:    String(orderId),
          orderNumber:   orderNumber ? String(orderNumber) : undefined,
          customerName:  customerName,
          customerPhone: phone,
          total:         totalPrice ? String(totalPrice) : undefined,
          currency:      currency || "USD",
          status:        "pending",
          rawData:       rawData ?? undefined,
          contactId:     contact.id,
        },
      });
    });

    // ── Step 3: تحديث عداد المزامنة ──────────────────────────────────────
    await step.run("update-sync-count", async () => {
      await prisma.shopifyStore.updateMany({
        where: { userId },
        data:  {
          lastSyncAt:  new Date(),
          totalSynced: { increment: 1 },
        },
      });
    });

    console.log(`[Shopify] ✓ Order #${orderNumber} saved — contact: ${contact.id}`);
    return { success: true, orderId: order.id, contactId: contact.id };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Function 2: Order Fulfilled — تحديث حالة الشحن
// ─────────────────────────────────────────────────────────────────────────────
export const handleShopifyOrderFulfilled = inngest.createFunction(
  {
    id:      "shopify-order-fulfilled",
    retries: 2,
    triggers: [{ event: "shopify/order.fulfilled" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, trackingUrl, trackingNumber } = event.data;

    await step.run("update-order-status", async () => {
      await prisma.storeOrder.updateMany({
        where: {
          userId,
          source:     "shopify",
          externalId: String(orderId),
        },
        data: {
          status:  "fulfilled",
          rawData: trackingUrl || trackingNumber
            ? { trackingUrl, trackingNumber }
            : undefined,
        },
      });
    });

    console.log(`[Shopify] ✓ Order #${orderNumber} marked fulfilled`);
    return { success: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Function 3: Order Updated — تحديث الحالة العامة
// ─────────────────────────────────────────────────────────────────────────────
export const handleShopifyOrderUpdated = inngest.createFunction(
  {
    id:      "shopify-order-updated",
    retries: 2,
    triggers: [{ event: "shopify/order.updated" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, status, fulfillmentStatus } = event.data;

    await step.run("update-order-status", async () => {
      await prisma.storeOrder.updateMany({
        where: {
          userId,
          source:     "shopify",
          externalId: String(orderId),
        },
        data: { status: fulfillmentStatus || status || "updated" },
      });
    });

    // لو اتشحن، بعت event مخصوص عشان يتعامل معه الـ automation
    if (fulfillmentStatus === "fulfilled") {
      await inngest.send({
        name: "shopify/order.fulfilled",
        data: event.data,
      });
    }

    console.log(`[Shopify] ✓ Order #${orderNumber} status updated`);
    return { processed: true };
  }
);
