// src/lib/notifications.ts
// ─── Helper مركزي لإنشاء الإشعارات ──────────────────────────────────────────
// كل trigger في السيستم بيستدعي من هنا — مفيش منطق مكرر

import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

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
    // الإشعارات مش حرجة — مش هنوقف السيستم لو فشلت
    console.error("[NOTIFY] Failed to create notification:", err);
  }
}

// ─── Presets جاهزة للاستخدام ─────────────────────────────────────────────────

export async function notifyCampaignSuccess(userId: string, campaignName: string, campaignId: string, sentCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_SUCCESS,
    title: "✅ تم إرسال الحملة بنجاح",
    body:  `حملة "${campaignName}" — تم إرسال ${sentCount.toLocaleString("ar-EG")} رسالة بنجاح`,
    link:  `/dashboard?section=campaigns`,
    meta:  { campaignId, sentCount },
  });
}

export async function notifyCampaignFailed(userId: string, campaignName: string, campaignId: string, failedCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_FAILED,
    title: "❌ فشل إرسال الحملة",
    body:  `حملة "${campaignName}" — فشل إرسال ${failedCount.toLocaleString("ar-EG")} رسالة`,
    link:  `/dashboard?section=campaigns`,
    meta:  { campaignId, failedCount },
  });
}

export async function notifyCampaignPartial(userId: string, campaignName: string, campaignId: string, sentCount: number, failedCount: number) {
  await createNotification({
    userId,
    type:  NotificationType.CAMPAIGN_PARTIAL,
    title: "⚠️ الحملة اكتملت جزئياً",
    body:  `حملة "${campaignName}" — ${sentCount.toLocaleString("ar-EG")} ناجحة، ${failedCount.toLocaleString("ar-EG")} فاشلة`,
    link:  `/dashboard?section=campaigns`,
    meta:  { campaignId, sentCount, failedCount },
  });
}

export async function notifyPlanLimitReached(userId: string, limitType: string) {
  const labels: Record<string, string> = {
    contacts:           "جهات الاتصال",
    campaignsPerMonth:  "الحملات الشهرية",
    teamMembers:        "أعضاء الفريق",
  };
  await createNotification({
    userId,
    type:  NotificationType.PLAN_LIMIT_REACHED,
    title: "🚨 وصلت لحد الباقة",
    body:  `وصلت للحد الأقصى لـ ${labels[limitType] ?? limitType} في باقتك الحالية`,
    link:  `/dashboard?section=api`,
    meta:  { limitType },
  });
}

export async function notifyNewMessage(userId: string, fromPhone: string) {
  await createNotification({
    userId,
    type:  NotificationType.NEW_MESSAGE,
    title: "💬 رسالة واردة جديدة",
    body:  `رسالة جديدة من ${fromPhone}`,
    link:  `/dashboard?section=chat`,
    meta:  { fromPhone },
  });
}
