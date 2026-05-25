// src/lib/notifications.ts
// ─── Helper مركزي لإنشاء الإشعارات ──────────────────────────────────────────

import prisma from "@/lib/prisma";
import { NotificationType } from "@/types/enums";

// ─── Bilingual text helper ────────────────────────────────────────────────────
const bi = (ar: string, en: string) => JSON.stringify({ ar, en });

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