// src/inngest/easy-orders-functions.ts
// ─── Inngest Functions for Easy Orders Events ─────────────────────────────────
// معالجة أحداث الطلبات القادمة من إيزي أوردرز وإرسال رسائل واتساب

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";

// ─────────────────────────────────────────────────────────────────────────────
// Function 1: easy-orders/order.created
// ─────────────────────────────────────────────────────────────────────────────
export const handleEasyOrdersOrderCreated = inngest.createFunction(
  {
    id:      "easy-orders-order-created",
    retries: 2,
    triggers: [{ event: "easy-orders/order.created" }],
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

    console.log(`[Inngest/EasyOrders] Order created: #${orderNumber}`);

    // ── Step 1: جيب حساب الواتساب الخاص بالتاجر ─────────────────────────────
    const user = await step.run("get-whatsapp-account", async () => {
      return await prisma.user.findUnique({
        where:  { id: userId },
        select: {
          whatsappAccount: {
            select: { accessToken: true, phoneNumberId: true },
          },
        },
      });
    });

    if (!user?.whatsappAccount) {
      console.log(`[Inngest/EasyOrders] User ${userId} has no WhatsApp account`);
      return { skipped: true, reason: "no_whatsapp" };
    }

    // ── Step 2: ابنِ رسالة تأكيد الطلب ─────────────────────────────────────
    const messageContent =
      `مرحباً ${customerName} 👋\n` +
      `تم استلام طلبك رقم #${orderNumber} بنجاح ✅\n` +
      `القيمة الإجمالية: ${totalPrice} جنيه\n\n` +
      `سنقوم بالتواصل معك قريباً لتأكيد التوصيل 🚀`;

    // ── Step 3: إرسال رسالة واتساب ───────────────────────────────────────────
    const result = await step.run(`send-order-msg-${orderId}`, async () => {
      return await sendWhatsAppMessage({
        toPhone:       customerPhone,
        phoneNumberId: user.whatsappAccount.phoneNumberId,
        accessToken:   user.whatsappAccount.accessToken,
        messageType:   "text",
        templateName:  null,
        templateLang:  "ar",
        templateVars:  null,
        content:       messageContent,
      });
    });

    // ── Step 4: حفظ الرسالة في قاعدة البيانات ────────────────────────────────
    if (result.ok) {
      await step.run("log-message", async () => {
        await prisma.message.create({
          data: {
            userId,
            contactId,
            content:     messageContent,
            type:        "text",
            direction:   "outbound",
            status:      "sent",
            whatsappId:  result.whatsappMsgId,
            sentAt:      new Date(),
          },
        });
      });

      console.log(`[Inngest/EasyOrders] Confirmation sent for order #${orderNumber}`);
      return { success: true, whatsappMsgId: result.whatsappMsgId };
    } else {
      console.error(`[Inngest/EasyOrders] Failed to send for order #${orderNumber}:`, result.error);
      return { success: false, error: result.error };
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Function 2: easy-orders/order.updated
// ─────────────────────────────────────────────────────────────────────────────
export const handleEasyOrdersOrderUpdated = inngest.createFunction(
  {
    id:      "easy-orders-order-updated",
    retries: 2,
    triggers: [{ event: "easy-orders/order.updated" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const {
      userId,
      orderId,
      orderNumber,
      status,
      customerName,
      customerPhone,
    } = event.data;

    console.log(`[Inngest/EasyOrders] Order updated: #${orderNumber} → ${status}`);

    // ── Step 1: جيب حساب الواتساب ────────────────────────────────────────────
    const user = await step.run("get-whatsapp-account", async () => {
      return await prisma.user.findUnique({
        where:  { id: userId },
        select: {
          whatsappAccount: {
            select: { accessToken: true, phoneNumberId: true },
          },
        },
      });
    });

    if (!user?.whatsappAccount) {
      return { skipped: true, reason: "no_whatsapp" };
    }

    // ── Step 2: جيب الـ contact ───────────────────────────────────────────────
    const contact = await step.run("get-contact", async () => {
      return await prisma.contact.findFirst({
        where: { phone: customerPhone, userId },
      });
    });

    if (!contact) {
      console.warn(`[Inngest/EasyOrders] Contact not found: ${customerPhone}`);
      return { skipped: true, reason: "no_contact" };
    }

    // ── Step 3: ترجمة الحالة لعربي ────────────────────────────────────────────
    const statusMessages: Record<string, string> = {
      confirmed:   "تم تأكيد طلبك ✅",
      processing:  "طلبك قيد التجهيز 📦",
      shipped:     "تم شحن طلبك 🚚",
      delivered:   "تم تسليم طلبك بنجاح 🎉",
      cancelled:   "تم إلغاء طلبك ❌",
      returned:    "تم استلام إرجاع طلبك 🔄",
    };

    const statusAr = statusMessages[status?.toLowerCase()] ?? `تم تحديث حالة طلبك إلى: ${status}`;

    const messageContent =
      `مرحباً ${customerName} 👋\n` +
      `بخصوص طلبك رقم #${orderNumber}:\n` +
      `${statusAr}\n\n` +
      `للاستفسار تواصل معنا عبر هذه المحادثة 💬`;

    // ── Step 4: إرسال رسالة الحالة ────────────────────────────────────────────
    const result = await step.run(`send-status-msg-${orderId}`, async () => {
      return await sendWhatsAppMessage({
        toPhone:       customerPhone,
        phoneNumberId: user.whatsappAccount.phoneNumberId,
        accessToken:   user.whatsappAccount.accessToken,
        messageType:   "text",
        templateName:  null,
        templateLang:  "ar",
        templateVars:  null,
        content:       messageContent,
      });
    });

    // ── Step 5: حفظ الرسالة ───────────────────────────────────────────────────
    if (result.ok) {
      await step.run("log-message", async () => {
        await prisma.message.create({
          data: {
            userId,
            contactId:   contact.id,
            content:     messageContent,
            type:        "text",
            direction:   "outbound",
            status:      "sent",
            whatsappId:  result.whatsappMsgId,
            sentAt:      new Date(),
          },
        });
      });

      console.log(`[Inngest/EasyOrders] Status update sent for order #${orderNumber}`);
      return { success: true };
    } else {
      console.error(`[Inngest/EasyOrders] Failed to send status for order #${orderNumber}`);
      return { success: false, error: result.error };
    }
  }
);