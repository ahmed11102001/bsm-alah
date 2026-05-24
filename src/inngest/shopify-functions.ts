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
          source_externalId_userId: {
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
          total:         totalPrice != null ? Number(totalPrice) : undefined,
          currency:      currency || "USD",
          status:        "pending",
          rawData:       rawData ?? undefined,
          contactId:     contact.id,
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
// Function 4: Cart Abandoned — استنى ساعة، تحقق، وابعت رسالة
// ─────────────────────────────────────────────────────────────────────────────
export const handleShopifyCartAbandoned = inngest.createFunction(
  {
    id:      "shopify-cart-abandoned",
    retries: 2,
    triggers: [{ event: "shopify/cart.abandoned" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      shopifyStoreId,
      checkoutToken,
      customerPhone,
      customerName,
      cartTotal,
      cartItems,
      recoveryUrl,
    } = event.data;

    if (!customerPhone || !checkoutToken) {
      return { skipped: true, reason: "missing_data" };
    }

    // ── استنى ساعة قبل الإرسال ───────────────────────────────────────────────
    await step.sleep("wait-before-sending", "1h");

    // ── تحقق: هل السلة اتحولت لأوردر؟ ──────────────────────────────────────
    const cart = await step.run("check-if-recovered", async () => {
      return prisma.abandonedCart.findFirst({
        where:  { externalId: checkoutToken, userId },
        select: { id: true, recoveredAt: true, sentAt: true },
      });
    });

    // لو اشترى فعلاً → لا ترسل
    if (cart?.recoveredAt) {
      console.log(`[CartAbandon] Already recovered — ${customerPhone}`);
      return { skipped: true, reason: "order_completed" };
    }

    // لو اتبعتت رسالة من قبل (checkouts/update بيجي أكتر من مرة) → تجاهل
    if (cart?.sentAt) {
      console.log(`[CartAbandon] Already sent — ${customerPhone}`);
      return { skipped: true, reason: "already_sent" };
    }

    // ── تحقق تاني: هل في أوردر بنفس رقم الموبايل في آخر ساعتين؟ ──────────
    // ده fallback لو ما انحفظش checkout_token في الأوردر
    const recentOrder = await step.run("check-recent-order", async () => {
      return prisma.storeOrder.findFirst({
        where: {
          userId,
          customerPhone,
          source: "shopify",
          orderedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
    });

    if (recentOrder) {
      // علّم السلة كـ recovered
      if (cart?.id) {
        await prisma.abandonedCart.update({
          where: { id: cart.id },
          data:  { recoveredAt: new Date() },
        }).catch(() => {});
      }
      console.log(`[CartAbandon] Recent order found — skipping ${customerPhone}`);
      return { skipped: true, reason: "recent_order_found" };
    }

    // ── ابعت رسالة السلة ─────────────────────────────────────────────────────
    const contact = await step.run("get-contact", async () => {
      return prisma.contact.findFirst({
        where:  { phone: customerPhone, userId },
        select: { id: true },
      });
    });

    if (!contact) {
      console.log(`[CartAbandon] Contact not found — ${customerPhone}`);
      return { skipped: true, reason: "no_contact" };
    }

    // أهم منتج في السلة (أول عنصر)
    const firstItem = Array.isArray(cartItems) && cartItems.length > 0
      ? (cartItems[0] as any)?.title ?? ""
      : "";

    const result = await step.run("send-cart-message", async () => {
      const { triggerStoreAutomation } = await import("@/lib/store-automation");
      return triggerStoreAutomation({
        userId,
        automationType: "cart_abandon",
        storeSource:    "shopify",
        storeId:        shopifyStoreId,
        customerPhone,
        contactId:      contact.id,
        // {{1}} اسم العميل  {{2}} المنتج  {{3}} الإجمالي  {{4}} رابط الاسترداد
        templateVars: {
          body: [
            customerName || "عزيزي العميل",
            firstItem,
            String(cartTotal ?? ""),
            recoveryUrl ?? "",
          ],
        },
      });
    });

    // سجّل sentAt في السلة
    if (result.sent && cart?.id) {
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data:  { sentAt: new Date() },
      }).catch(() => {});
    }

    console.log(
      result.sent
        ? `[CartAbandon] ✓ Sent to ${customerPhone}`
        : `[CartAbandon] ✗ Failed — ${result.reason}`
    );

    return { sent: result.sent, reason: result.reason };
  }
);
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