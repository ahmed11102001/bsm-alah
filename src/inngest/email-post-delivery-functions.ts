// src/inngest/email-post-delivery-functions.ts
// ─── أتمتة "بعد الاستلام" (إيميل) ───────────────────────────────────────────
// بتسمع لنفس أحداث الـ fulfilled بتاعة الواتساب (shopify/woocommerce) من غير
// ما تلمس كودها. بعد الشحن بـ 7 أيام: إيميل بالقالب المحدد لو الأتمتة لسه
// مفعّلة والعميل عنده إيميل. (EasyOrders مبيبعتش fulfilled event أصلًا).

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendEmailViaUserSmtp } from "@/lib/email-marketing/sender";

const POST_DELIVERY_DELAY = "7d";

export async function loadPostDeliverySetup(userId: string) {
  const automation = await prisma.emailAutomation.findUnique({
    where: { userId_type: { userId, type: "POST_DELIVERY" } },
    include: {
      template: { select: { id: true, subject: true, bodyHtml: true, previewText: true } },
    },
  });
  if (!automation?.enabled || !automation.templateId || !automation.template) return null;
  return automation;
}

export async function loadOrderContact(userId: string, source: string, orderId: unknown) {
  if (orderId === null || orderId === undefined) return null;
  const order = await prisma.storeOrder.findFirst({
    where: { userId, source: source as any, externalId: String(orderId) },
    select: { id: true, contact: { select: { id: true, email: true, name: true } } },
  });
  const contact = order?.contact;
  const email = contact?.email?.trim();
  if (!order || !contact || !email) return null;
  return { orderId: order.id, contactId: contact.id, email, name: contact.name };
}

export async function sendPostDeliveryEmail(userId: string, source: string, orderId: unknown) {
  // إعادة التحقق لحظة الإرسال (الأتمتة ممكن تكون اتقفلت خلال الـ 7 أيام)
  const automation = await loadPostDeliverySetup(userId);
  if (!automation?.template) return { sent: false as const, reason: "automation_off" };

  const target = await loadOrderContact(userId, source, orderId);
  if (!target) return { sent: false as const, reason: "no_email" };

  const delivery = await prisma.emailDelivery.create({
    data: {
      campaignId: null,
      contactId: target.contactId,
      contactEmail: target.email,
      contactName: target.name || null,
      status: "QUEUED",
    },
  });

  const res = await sendEmailViaUserSmtp(userId, {
    to: target.email,
    recipientName: target.name,
    subject: automation.template.subject,
    html: automation.template.bodyHtml,
    previewText: automation.template.previewText,
  });

  if (res.success) {
    await prisma.emailDelivery
      .update({ where: { id: delivery.id }, data: { status: "DELIVERED", sentAt: new Date() } })
      .catch(() => {});
    return { sent: true as const };
  }
  await prisma.emailDelivery
    .update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: res.error || "خطأ في الإرسال", sentAt: new Date() },
    })
    .catch(() => {});
  return { sent: false as const, reason: "send_failed" };
}

function makePostDeliveryFunction(id: string, eventName: string, source: "shopify" | "woocommerce") {
  return inngest.createFunction(
    { id, name: `Post-delivery email (${source})`, retries: 2, triggers: [{ event: eventName }] },
    async ({ event, step }: { event: any; step: any }) => {
      const { userId, orderId, orderNumber } = event.data ?? {};

      const setup = await step.run("check-automation", () => loadPostDeliverySetup(userId));
      if (!setup) return { skipped: true, reason: "automation_off" };

      const target = await step.run("resolve-contact", () => loadOrderContact(userId, source, orderId));
      if (!target) return { skipped: true, reason: "no_email" };

      await step.sleep("wait-7-days", POST_DELIVERY_DELAY);

      const result = await step.run("send-email", () => sendPostDeliveryEmail(userId, source, orderId));
      console.log(
        `[post-delivery-email] order ${orderNumber ?? orderId} (${source}) →`,
        result.sent ? "sent" : `skipped (${result.reason})`
      );
      return result.sent ? { success: true } : { skipped: true, reason: result.reason };
    }
  );
}

export const postDeliveryShopify = makePostDeliveryFunction(
  "email-post-delivery-shopify",
  "shopify/order.fulfilled",
  "shopify"
);

export const postDeliveryWoo = makePostDeliveryFunction(
  "email-post-delivery-woo",
  "woocommerce/order.fulfilled",
  "woocommerce"
);
