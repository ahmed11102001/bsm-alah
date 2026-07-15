// src/lib/notifications.ts
// ─── Helper مركزي لإنشاء الإشعارات ──────────────────────────────────────────

import prisma from "@/lib/prisma";
import { NotificationType } from "@/types/enums";
import { sendPushToUser } from "./push";

const PUSH_ENABLED_TYPES = new Set<NotificationType>([
  "SUBSCRIPTION_EXPIRING",
  "PAYMENT_FAILED",
  "WHATSAPP_TOKEN_EXPIRING",
  "AI_TOKENS_LOW",
  "CAMPAIGN_SUCCESS",
  "CAMPAIGN_FAILED",
  "CAMPAIGN_PARTIAL",
  "PLAN_LIMIT_REACHED",
  "STORE_AUTO_FAILED",
  "SUBSCRIPTION_SUCCESS",
  "SMART_FOLLOWUP_ALERT",
]);

// ─── Bilingual text helper ────────────────────────────────────────────────────
const bi = (ar: string, en: string) => JSON.stringify({ ar, en });

function safeParseBi(title: string, body: string) {
  try {
    const parsedTitle = JSON.parse(title);
    const parsedBody = JSON.parse(body);
    return {
      title: parsedTitle.ar || title,
      body: parsedBody.ar || body,
    };
  } catch {
    return { title, body };
  }
}

type CreateNotificationParams = {
  userId: string;
  type:   NotificationType;
  title:  string;
  body:   string;
  link?:  string;
  meta?:  Record<string, any>;
};

export async function createNotification(params: CreateNotificationParams) {
  try {
    await prisma.notification.create({ data: params });
    
    if (PUSH_ENABLED_TYPES.has(params.type)) {
      const parsed = safeParseBi(params.title, params.body);
      await sendPushToUser(params.userId, {
        title: parsed.title,
        body: parsed.body,
        url: params.link ?? "/dashboard",
      }).catch(err => console.error("[PUSH] Failed:", err));
    }
  } catch (err) {
    console.error("[NOTIFY] Failed to create notification:", err);
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export async function notifyCampaignSuccess(userId: string, campaignName: string, campaignId: string, sentCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_SUCCESS,
    title: bi("✅ تم إرسال الحملة بنجاح", "✅ Campaign sent successfully"),
    body:  bi(
      `حملة "${campaignName}" — تم إرسال ${sentCount.toLocaleString("ar-EG")} رسالة بنجاح`,
      `Campaign "${campaignName}" — ${sentCount.toLocaleString()} messages sent successfully`,
    ),
    link: `/dashboard?section=campaigns`,
    meta: { campaignId, sentCount },
  });
}

export async function notifyCampaignFailed(userId: string, campaignName: string, campaignId: string, failedCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_FAILED,
    title: bi("❌ فشل إرسال الحملة", "❌ Campaign failed"),
    body:  bi(
      `حملة "${campaignName}" — فشل إرسال ${failedCount.toLocaleString("ar-EG")} رسالة`,
      `Campaign "${campaignName}" — ${failedCount.toLocaleString()} messages failed`,
    ),
    link: `/dashboard?section=campaigns`,
    meta: { campaignId, failedCount },
  });
}

export async function notifyCampaignPartial(userId: string, campaignName: string, campaignId: string, sentCount: number, failedCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_PARTIAL,
    title: bi("⚠️ الحملة اكتملت جزئياً", "⚠️ Campaign partially completed"),
    body:  bi(
      `حملة "${campaignName}" — ${sentCount.toLocaleString("ar-EG")} ناجحة، ${failedCount.toLocaleString("ar-EG")} فاشلة`,
      `Campaign "${campaignName}" — ${sentCount.toLocaleString()} sent, ${failedCount.toLocaleString()} failed`,
    ),
    link: `/dashboard?section=campaigns`,
    meta: { campaignId, sentCount, failedCount },
  });
}

export async function notifyPlanLimitReached(userId: string, limitType: string) {
  const labelsAr: Record<string, string> = {
    contacts:          "جهات الاتصال",
    campaignsPerMonth: "الحملات الشهرية",
    teamMembers:       "أعضاء الفريق",
  };
  const labelsEn: Record<string, string> = {
    contacts:          "contacts",
    campaignsPerMonth: "monthly campaigns",
    teamMembers:       "team members",
  };
  await createNotification({
    userId,
    type:  NotificationType.PLAN_LIMIT_REACHED,
    title: bi("🚨 وصلت لحد الباقة", "🚨 Plan limit reached"),
    body:  bi(
      `وصلت للحد الأقصى لـ ${labelsAr[limitType] ?? limitType} في باقتك الحالية`,
      `You've reached the limit for ${labelsEn[limitType] ?? limitType} in your current plan`,
    ),
    link: `/dashboard?section=api`,
    meta: { limitType },
  });
}

export async function notifyNewMessage(userId: string, fromPhone: string) {
  await createNotification({
    userId,
    type:  NotificationType.NEW_MESSAGE,
    title: bi("💬 رسالة واردة جديدة", "💬 New incoming message"),
    body:  bi(
      `رسالة جديدة من ${fromPhone}`,
      `New message from ${fromPhone}`,
    ),
    link: `/dashboard?section=chat`,
    meta: { fromPhone },
  });
}

// ─── أتمتة المتجر ─────────────────────────────────────────────────────────────

const autoAr: Record<string, string> = { order_confirm: "تأكيد الطلب", order_shipped: "تحديث الشحن", promo: "عرض ترويجي" };
const autoEn: Record<string, string> = { order_confirm: "Order Confirmation", order_shipped: "Shipping Update", promo: "Promo Offer" };
const storeLabels: Record<string, string> = { shopify: "Shopify", woocommerce: "WooCommerce", easyorders: "EasyOrders" };

export async function notifyStoreAutoSent(
  userId: string, automationType: string, storeSource: string,
  customerPhone: string, templateName: string,
) {
  const store = storeLabels[storeSource] ?? storeSource;
  await createNotification({
    userId,
    type:  NotificationType.STORE_AUTO_SENT,
    title: bi(
      `🛒 تم إرسال قالب ${autoAr[automationType] ?? automationType}`,
      `🛒 ${autoEn[automationType] ?? automationType} template sent`,
    ),
    body: bi(
      `${store}: تم إرسال "${templateName}" إلى ${customerPhone}`,
      `${store}: "${templateName}" sent to ${customerPhone}`,
    ),
    link: `/dashboard?section=store`,
    meta: { automationType, storeSource, customerPhone, templateName },
  });
}

export async function notifyStoreAutoFailed(
  userId: string, automationType: string, storeSource: string,
  customerPhone: string, templateName: string, reason: string,
) {
  const store = storeLabels[storeSource] ?? storeSource;
  await createNotification({
    userId,
    type:  NotificationType.STORE_AUTO_FAILED,
    title: bi(
      `❌ فشل إرسال قالب ${autoAr[automationType] ?? automationType}`,
      `❌ ${autoEn[automationType] ?? automationType} template failed`,
    ),
    body: bi(
      `${store}: فشل إرسال "${templateName}" إلى ${customerPhone} — ${reason}`,
      `${store}: Failed to send "${templateName}" to ${customerPhone} — ${reason}`,
    ),
    link: `/dashboard?section=store`,
    meta: { automationType, storeSource, customerPhone, templateName, reason },
  });
}

// ─── إشعارات النظام والباقة ───────────────────────────────────────────────────

export async function notifySubscriptionExpiring(userId: string, planName: string, daysLeft: number) {
  await createNotification({
    userId,
    type: NotificationType.SUBSCRIPTION_EXPIRING,
    title: bi("⚠️ باقتك ستنتهي قريباً", "⚠️ Subscription expiring soon"),
    body: bi(
      `باقتك (${planName}) ستنتهي بعد ${daysLeft} أيام. يرجى التجديد لتجنب توقف الخدمة.`,
      `Your (${planName}) plan expires in ${daysLeft} days. Please renew to avoid service interruption.`
    ),
    link: "/dashboard?section=api", // or billing section
  });
}

export async function notifyPaymentFailed(userId: string, planName: string) {
  await createNotification({
    userId,
    type: NotificationType.PAYMENT_FAILED,
    title: bi("❌ فشل عملية الدفع", "❌ Payment failed"),
    body: bi(
      `لم نتمكن من تجديد باقة (${planName}). يرجى التحقق من طريقة الدفع الخاصة بك.`,
      `We couldn't renew your (${planName}) plan. Please check your payment method.`
    ),
    link: "/dashboard?section=api",
  });
}

export async function notifyWhatsAppTokenExpiring(userId: string, daysLeft: number) {
  await createNotification({
    userId,
    type: NotificationType.WHATSAPP_TOKEN_EXPIRING,
    title: bi("⚠️ تنبيه: اقتراب انتهاء صلاحية ربط واتساب", "⚠️ WhatsApp token expiring soon"),
    body: bi(
      `ربط واتساب الخاص بك سينتهي خلال ${daysLeft} أيام. يرجى إعادة الربط لضمان استمرار البوت.`,
      `Your WhatsApp connection will expire in ${daysLeft} days. Please reconnect to keep the bot running.`
    ),
    link: "/dashboard?section=api",
  });
}

export async function notifyAiTokensLow(userId: string, usedPct: number) {
  await createNotification({
    userId,
    type: NotificationType.AI_TOKENS_LOW,
    title: bi("⚠️ رصيد الذكاء الاصطناعي منخفض", "⚠️ AI tokens low"),
    body: bi(
      `لقد استهلكت ${usedPct}% من رصيد الذكاء الاصطناعي لهذا الشهر.`,
      `You have used ${usedPct}% of your AI tokens for this month.`
    ),
    link: "/dashboard?section=api",
  });
}

export async function notifySubscriptionSuccess(userId: string, planName: string) {
  await createNotification({
    userId,
    type: NotificationType.SUBSCRIPTION_SUCCESS,
    title: bi("🎉 تم تفعيل الباقة بنجاح", "🎉 Subscription activated successfully"),
    body: bi(
      `تم تفعيل باقة (${planName}) الخاصة بك بنجاح. استمتع بميزات واتس برو!`,
      `Your (${planName}) plan has been activated successfully. Enjoy WhatsPro features!`
    ),
    link: "/dashboard?section=api",
  });
}

export async function notifyAiHandoffNeeded(
  userId: string,
  contactName: string,
  contactId: string,
  reason: string | null,
  priority: "normal" | "high" = "normal",
) {
  const priorityTag = priority === "high" ? "🔴 عاجل — " : "";

  await createNotification({
    userId,
    type: NotificationType.AI_HANDOFF_NEEDED,
    title: bi(`${priorityTag}🤖 AI طلب تحويل المحادثة`, `${priorityTag}🤖 AI requested handoff`),
    body: bi(
      `العميل: ${contactName}${reason ? `\nالسبب: ${reason}` : ""}`,
      `Customer: ${contactName}${reason ? `\nReason: ${reason}` : ""}`,
    ),
    link: `/dashboard?section=chat&contactId=${contactId}`,
    meta: { contactId, reason, priority },
  });
}

export async function notifyOrderConfirmed(userId: string, orderNumber: string, customerPhone: string) {
  await createNotification({
    userId,
    type: NotificationType.ORDER_CONFIRMED,
    title: bi(`✅ تم تأكيد الطلب #${orderNumber}`, `✅ Order #${orderNumber} confirmed`),
    body: bi(
      `قام العميل (${customerPhone}) بتأكيد الطلب #${orderNumber} بنجاح.`,
      `Customer (${customerPhone}) successfully confirmed order #${orderNumber}.`
    ),
    link: "/dashboard?section=store",
  });
}

// ─── Smart Follow-Up Alert ────────────────────────────────────────────────────

export async function notifySmartFollowUpAlert(
  userId: string,
  kind: "low_rating" | "cart_not_interested" | "shipping_send_failed" | "shipping_not_delivered" | "cart_send_failed" | "order_cancelled_with_reason" | "campaign_send_failed",
  details: { customerPhone: string; orderNumber?: string; rating?: number; reason?: string; error?: string },
) {
  const titles: Record<typeof kind, { ar: string; en: string }> = {
    low_rating:             { ar: "🔴 تقييم منخفض من عميل",       en: "🔴 Low customer rating" },
    cart_not_interested:    { ar: "📭 عميل غير مهتم بالسلة",      en: "📭 Customer not interested in cart" },
    shipping_send_failed:   { ar: "❌ فشل إرسال متابعة الشحن",    en: "❌ Shipping follow-up send failed" },
    shipping_not_delivered: { ar: "⚠️ عميل قال: لم يستلم الشحنة", en: "⚠️ Customer reported not delivered" },
    cart_send_failed:       { ar: "❌ فشل إرسال متابعة السلة",     en: "❌ Cart follow-up send failed" },
    order_cancelled_with_reason: { ar: "❌ إلغاء طلب مع سبب",      en: "❌ Order cancelled with reason" },
    campaign_send_failed:   { ar: "❌ فشل إرسال متابعة الحملة",    en: "❌ Campaign follow-up send failed" },
  };

  const bodies: Record<typeof kind, (d: typeof details) => { ar: string; en: string }> = {
    low_rating: (d) => ({
      ar: `العميل ${d.customerPhone} قيّم الطلب ${d.orderNumber ?? ""} بـ ${d.rating} نجوم`,
      en: `Customer ${d.customerPhone} rated order ${d.orderNumber ?? ""} ${d.rating} stars`,
    }),
    cart_not_interested: (d) => ({
      ar: `العميل ${d.customerPhone} غير مهتم — السبب: ${d.reason ?? "غير معروف"}`,
      en: `Customer ${d.customerPhone} not interested — reason: ${d.reason ?? "unknown"}`,
    }),
    shipping_send_failed: (d) => ({
      ar: `فشل إرسال متابعة الشحن لـ ${d.customerPhone} — ${d.error ?? ""}`,
      en: `Shipping follow-up failed for ${d.customerPhone} — ${d.error ?? ""}`,
    }),
    shipping_not_delivered: (d) => ({
      ar: `العميل ${d.customerPhone} أبلغ أن الشحنة لم تصل — طلب متابعة`,
      en: `Customer ${d.customerPhone} reported the shipment as not delivered — please follow up`,
    }),
    cart_send_failed: (d) => ({
      ar: `فشل إرسال متابعة السلة لـ ${d.customerPhone} — ${d.error ?? ""}`,
      en: `Cart follow-up failed for ${d.customerPhone} — ${d.error ?? ""}`,
    }),
    order_cancelled_with_reason: (d) => ({
      ar: `العميل ${d.customerPhone} ألغى الطلب ${d.orderNumber ?? ""} — السبب: ${d.reason ?? "غير معروف"}`,
      en: `Customer ${d.customerPhone} cancelled order ${d.orderNumber ?? ""} — reason: ${d.reason ?? "unknown"}`,
    }),
    campaign_send_failed: (d) => ({
      ar: `فشل إرسال متابعة الحملة لـ ${d.customerPhone} — ${d.error ?? ""}`,
      en: `Campaign follow-up failed for ${d.customerPhone} — ${d.error ?? ""}`,
    }),
  };

  const t = titles[kind];
  const b = bodies[kind](details);

  await createNotification({
    userId,
    type:  NotificationType.SMART_FOLLOWUP_ALERT,
    title: bi(t.ar, t.en),
    body:  bi(b.ar, b.en),
    link:  "/dashboard?section=store",
    meta:  { kind, ...details },
  });
}

export async function notifyOrderCancelled(userId: string, orderNumber: string, customerPhone: string) {
  await createNotification({
    userId,
    type: NotificationType.ORDER_CANCELLED,
    title: NotificationType.ORDER_CANCELLED === "ORDER_CANCELLED" ? bi(`❌ تم إلغاء الطلب #${orderNumber}`, `❌ Order #${orderNumber} cancelled`) : "...", // using simple bi
    body: bi(
      `قام العميل (${customerPhone}) بإلغاء الطلب #${orderNumber}.`,
      `Customer (${customerPhone}) cancelled order #${orderNumber}.`
    ),
    link: "/dashboard?section=store",
  });
}
