// src/inngest/woocommerce-functions.ts
// ─── أتمتة WooCommerce — نفس بنية EasyOrders ─────────────────────────────────
import { inngest } from "./client";
import prisma      from "@/lib/prisma";

export const handleWooOrderReceived = inngest.createFunction(
  {
    id:       "woo-order-received",
    retries:  2,
    triggers: [{ event: "woocommerce/order.received" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      phone,
      name,
      orderNumber,
      total,
      currency,
      status,
      wooCommerceStoreId,
    } = event.data;

    if (!phone) {
      console.warn("[WOO Inngest] No phone — skipping");
      return { skipped: true, reason: "no_phone" };
    }

    // ── Step 1: Upsert Contact ──────────────────────────────────────────────
    const contact = await step.run("upsert-contact", async () => {
      return prisma.contact.upsert({
        where:  { phone_userId: { phone, userId } },
        update: { name: name && name !== "العميل" ? name : undefined },
        create: { phone, userId, name: name || "عميل" },
      });
    });

    // ── Step 2: Fire StoreAutomation — order_confirm ──────────────────────
    // الأتمتة نفسها بتشتغل من صفحة المتجر زي Shopify و EasyOrders
    // الإرسال يحصل من StoreAutomation trigger اللي بتشوف لو isEnabled = true

    const automation = await step.run("check-confirm-automation", async () => {
      if (!wooCommerceStoreId) return null;
      return prisma.storeAutomation.findFirst({
        where: {
          wooCommerceStoreId,
          type:      "order_confirm",
          isEnabled: true,
        },
        include: {
          template: { select: { id: true, name: true } },
        },
      });
    });

    if (automation?.templateId) {
      await step.run("send-confirm-message", async () => {
        // بعت event لـ Inngest Campaign sender
        await inngest.send({
          name: "store/automation.trigger",
          data: {
            userId,
            contactId:   contact.id,
            phone,
            customerName: name,
            orderNumber,
            total,
            currency,
            templateId:  automation.templateId,
            automationType: "order_confirm",
            source:      "woocommerce",
          },
        });

        // زود عداد الـ sent
        await prisma.storeAutomation.update({
          where: { id: automation.id },
          data:  { sentCount: { increment: 1 } },
        });
      });
    }

    return { success: true, contactId: contact.id };
  }
);