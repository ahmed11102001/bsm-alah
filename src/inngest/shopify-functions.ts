// src/inngest/shopify-functions.ts
// ─── Inngest Functions for Shopify Events ────────────────────────────────────
// Handles order events from Shopify and triggers WhatsApp automations

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Function 1: Handle Order Created Event
// ─────────────────────────────────────────────────────────────────────────────

export const handleShopifyOrderCreated = inngest.createFunction(
  {
    id: "shopify-order-created",
    retries: 2,
    triggers: [{ event: "shopify/order.created" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      contactId,
      orderId,
      orderNumber,
      totalPrice,
      customerName,
      customerPhone,
    } = event.data;

    console.log(`[Inngest] Processing order created: ${orderNumber}`);

    // ── Step 1: Get user and WhatsApp account ────────────────────────────────
    const user = await step.run("get-user-data", async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          whatsappAccount: {
            select: {
              accessToken: true,
              phoneNumberId: true,
            },
          },
        },
      });
    });

    if (!user?.whatsappAccount) {
      console.log(`[Inngest] User ${userId} has no WhatsApp account configured`);
      return { skipped: true };
    }

    // ── Step 2: بناء رسالة تأكيد الأوردر ────────────────────────────────────
    const messageContent = [
      `مرحباً ${customerName || "عزيزنا"}! 👋`,
      ``,
      `✅ تم استلام طلبك بنجاح`,
      `📦 رقم الطلب: #${orderNumber}`,
      `💰 الإجمالي: ${totalPrice}`,
      ``,
      `سيتم التواصل معك قريباً لتأكيد التفاصيل.`,
      `شكراً لثقتك بنا! 🙏`,
    ].join("\n");

    // ── Step 4: Send WhatsApp message ────────────────────────────────────────
    const result = await step.run(`send-order-message-${orderId}`, async () => {
      return await sendWhatsAppMessage({
        toPhone: customerPhone,
        phoneNumberId: user.whatsappAccount.phoneNumberId,
        accessToken: user.whatsappAccount.accessToken,
        messageType: "text",
        templateName: null,
        templateLang: "ar",
        templateVars: null,
        content: messageContent,
      });
    });

    // ── Step 5: Log message in database ──────────────────────────────────────
    if (result.ok) {
      await step.run("log-message", async () => {
        await prisma.message.create({
          data: {
            userId,
            contactId,
            content: messageContent,
            type: "text",
            direction: "outbound",
            status: "sent",
            whatsappId: result.whatsappMsgId,
            sentAt: new Date(),
          },
        });
      });

      console.log(`[Inngest] Message sent for order ${orderNumber}`);
      return { success: true, messageId: result.whatsappMsgId };
    } else {
      console.error(
        `[Inngest] Failed to send message for order ${orderNumber}:`,
        result.error
      );
      return { success: false, error: result.error };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Function 2: Handle Order Fulfilled Event
// ─────────────────────────────────────────────────────────────────────────────

export const handleShopifyOrderFulfilled = inngest.createFunction(
  {
    id: "shopify-order-fulfilled",
    retries: 2,
    triggers: [{ event: "shopify/order.fulfilled" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, customerPhone, trackingUrl } = event.data;

    console.log(`[Inngest] Processing order fulfilled: ${orderNumber}`);

    // ── Step 1: Get user and WhatsApp account ────────────────────────────────
    const user = await step.run("get-user-data", async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          whatsappAccount: {
            select: {
              accessToken: true,
              phoneNumberId: true,
            },
          },
        },
      });
    });

    if (!user?.whatsappAccount) {
      return { skipped: true };
    }

    // ── Step 2: Get or create contact ────────────────────────────────────────
    const contact = await step.run("get-contact", async () => {
      return await prisma.contact.findFirst({
        where: {
          phone: customerPhone.replace(/\D/g, ""),
          userId,
        },
      });
    });

    if (!contact) {
      console.log(`[Inngest] Contact not found for phone ${customerPhone}`);
      return { skipped: true };
    }

    // ── Step 3: Prepare fulfillment message ──────────────────────────────────
    let messageContent = `تم شحن طلبك #${orderNumber}`;

    if (trackingUrl) {
      messageContent += `\n\nرابط التتبع: ${trackingUrl}`;
    }

    messageContent += "\n\nشكراً لتعاملك معنا! 📦";

    // ── Step 4: Send WhatsApp message ────────────────────────────────────────
    const result = await step.run(`send-fulfillment-message-${orderId}`, async () => {
      return await sendWhatsAppMessage({
        toPhone: customerPhone,
        phoneNumberId: user.whatsappAccount.phoneNumberId,
        accessToken: user.whatsappAccount.accessToken,
        messageType: "text",
        templateName: null,
        templateLang: "ar",
        templateVars: null,
        content: messageContent,
      });
    });

    // ── Step 5: Log message in database ──────────────────────────────────────
    if (result.ok) {
      await step.run("log-message", async () => {
        await prisma.message.create({
          data: {
            userId,
            contactId: contact.id,
            content: messageContent,
            type: "text",
            direction: "outbound",
            status: "sent",
            whatsappId: result.whatsappMsgId,
            sentAt: new Date(),
          },
        });
      });

      console.log(`[Inngest] Fulfillment message sent for order ${orderNumber}`);
      return { success: true };
    } else {
      console.error(
        `[Inngest] Failed to send fulfillment message for order ${orderNumber}`
      );
      return { success: false, error: result.error };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Function 3: Handle Order Updated Event
// ─────────────────────────────────────────────────────────────────────────────

export const handleShopifyOrderUpdated = inngest.createFunction(
  {
    id: "shopify-order-updated",
    retries: 2,
    triggers: [{ event: "shopify/order.updated" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, orderId, orderNumber, status, fulfillmentStatus, customerPhone } =
      event.data;

    console.log(`[Inngest] Processing order updated: ${orderNumber}`);

    // For now, we'll just log the update
    // In a production system, you might want to send status updates to the customer

    if (fulfillmentStatus === "fulfilled") {
      // Trigger the fulfilled event if it hasn't been triggered yet
      await inngest.send({
        name: "shopify/order.fulfilled",
        data: event.data,
      });
    }

    return { processed: true };
  }
);