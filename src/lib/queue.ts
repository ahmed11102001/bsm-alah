// src/lib/queue.ts
// ─── Queue Management ─────────────────────────────────────────────────────────
// مسؤول بس عن: إضافة الرسائل للـ Queue + تشغيل الحملات المجدولة
// الإرسال الفعلي بيتم من خلال Inngest (src/inngest/functions.ts)

import prisma from "@/lib/prisma";
import {
  QueueStatus,
  CampaignStatus,
  MessageStatus,
  MessageType,
  MessageDirection,
} from "@/types/enums";
import { sendWhatsAppMessage, QUEUE_CONSTANTS } from "@/lib/whatsapp-api";
import { notifyPlanLimitReached } from "@/lib/notifications";
import { inngest } from "@/inngest/client";

const { DELAY_BETWEEN_MSGS, BACKOFF_STEPS_SEC, TIER_DAILY_LIMIT, TIER_BATCH_SIZE } = QUEUE_CONSTANTS;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

// ─── Helper: delay ────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Helper: إعادة تصفير العداد اليومي لو تغير اليوم ────────────────────────
async function resetDailyCounterIfNeeded(accountId: string, resetAt: Date) {
  const now = new Date();
  const reset = new Date(resetAt);
  if (
    now.getUTCDate() !== reset.getUTCDate() ||
    now.getUTCMonth() !== reset.getUTCMonth() ||
    now.getUTCFullYear() !== reset.getUTCFullYear()
  ) {
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data: { dailySentCount: 0, dailyResetAt: now },
    });
    return 0;
  }
  return null;
}

// ─── handleRateLimit: تفعيل الـ Backoff على الرقم ───────────────────────────
async function applyBackoff(accountId: string, currentCount: number) {
  const step = Math.min(currentCount, BACKOFF_STEPS_SEC.length - 1);
  const seconds = BACKOFF_STEPS_SEC[step];
  const until = new Date(Date.now() + seconds * 1000);

  await prisma.whatsAppAccount.update({
    where: { id: accountId },
    data: {
      backoffUntil: until,
      backoffCount: { increment: 1 },
    },
  });

  console.warn(`[QUEUE] Backoff applied to account ${accountId} for ${seconds}s`);
}

// ─── clearBackoff: تصفير الـ backoff بعد نجاح ────────────────────────────────
async function clearBackoff(accountId: string) {
  await prisma.whatsAppAccount.update({
    where: { id: accountId },
    data: { backoffUntil: null, backoffCount: 0 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية: processQueue
// ═══════════════════════════════════════════════════════════════════════════════
export async function processQueue(): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  const now = new Date();

  // ── Fan-out: بنجيب الـ pending items ونبعت Inngest event لكل واحدة ──────────
  // كل رسالة بتشتغل independently على Inngest — مفيش delays هنا على Vercel
  const BATCH_LIMIT = 200; // max per cron run



  // جيب الـ pending items (غير محجوزة) مع account info
  const pendingItems = await prisma.messageQueue.findMany({
    where: {
      status: QueueStatus.pending,
      scheduledAt: { lte: now },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: BATCH_LIMIT,
    select: {
      id: true,
      phoneNumberId: true,
    },
  });

  if (pendingItems.length === 0) return result;

  // Fan-out: بعت event لكل رسالة
  await inngest.send(
    pendingItems.map((item) => ({
      name: "queue/process-item",
      data: {
        queueId: item.id,
        phoneNumberId: item.phoneNumberId,
      },
    }))
  );

  result.processed = pendingItems.length;
  console.log(`[QUEUE] Fan-out: dispatched ${pendingItems.length} items to Inngest`);

  return result;
}

// ─── checkAndCompleteCampaigns: إغلاق الحملات المكتملة ─────────────────────
async function checkAndCompleteCampaigns(campaignIds: string[]) {
  if (campaignIds.length === 0) return;
  const unique = [...new Set(campaignIds)];

  // جيب كل الحملات دفعة واحدة (بدل N+1 query)
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, userId: true, queuedCount: true, status: true, sentCount: true, failedCount: true },
  });

  for (const campaign of campaigns) {
    if (campaign.status !== CampaignStatus.running) continue;
    if (campaign.queuedCount > 0) continue;

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.completed, completedAt: new Date() },
    });

    // إشعار حسب النتيجة
    const sent = campaign.sentCount;
    const failed = campaign.failedCount;

    try {
      const { notifyCampaignSuccess, notifyCampaignFailed, notifyCampaignPartial } =
        await import("@/lib/notifications");

      if (failed === 0) {
        await notifyCampaignSuccess(campaign.userId, campaign.name, campaign.id, sent);
      } else if (sent === 0) {
        await notifyCampaignFailed(campaign.userId, campaign.name, campaign.id, failed);
      } else {
        await notifyCampaignPartial(campaign.userId, campaign.name, campaign.id, sent, failed);
      }
    } catch (err) {
      console.error("[QUEUE] Failed to send campaign notification:", err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// enqueueCampaign: إضافة حملة للـ Queue (يُستدعى من campaigns/route.ts)
// ═══════════════════════════════════════════════════════════════════════════════
export async function enqueueCampaign(params: {
  campaignId: string;
  userId: string;
  numbers: string[];
  recipients?: { phone: string; templateVars?: any }[];
  templateName: string;
  templateLang?: string;
  templateVars?: any;
  scheduledAt?: Date | null;
  whatsappAccountId: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<{ queued: number }> {
  const {
    campaignId, userId, numbers, recipients, templateName,
    templateLang = "ar", templateVars, scheduledAt,
    whatsappAccountId, phoneNumberId, accessToken,
  } = params;

  const sendAt = scheduledAt ?? new Date();

  // Build a lookup map from recipients if provided (per-phone templateVars)
  const recipientMap = new Map<string, any>();
  if (Array.isArray(recipients)) {
    for (const r of recipients) {
      if (r.phone) recipientMap.set(r.phone, r.templateVars ?? null);
    }
  }

  // إنشاء الـ queue records دفعة واحدة
  const data = numbers.map((phone) => ({
    userId,
    whatsappAccountId,
    phoneNumberId,
    toPhone: phone,
    messageType: "template",
    templateName,
    templateLang,
    // Use per-recipient vars if available, fall back to shared templateVars
    templateVars: recipientMap.size > 0
      ? (recipientMap.get(phone) ?? templateVars ?? undefined)
      : (templateVars ?? undefined),
    campaignId,
    scheduledAt: sendAt,
    status: QueueStatus.pending,
  }));

  // createMany لأداء أفضل
  await prisma.messageQueue.createMany({ data, skipDuplicates: false });

  // تحديث حالة الحملة
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: scheduledAt ? CampaignStatus.scheduled : CampaignStatus.running,
      totalQueued: numbers.length,
      queuedCount: numbers.length,
      startedAt: scheduledAt ? null : new Date(),
      scheduledAt: scheduledAt ?? null,
    },
  });

  return { queued: numbers.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// enqueueDirectMessage: رسالة chat فردية → Queue (بدل fire-and-forget)
// الـ Cron هيبعتها خلال أقل من دقيقة مع نفس الـ rate-limit وbackoff logic
// ═══════════════════════════════════════════════════════════════════════════════
export async function enqueueDirectMessage(params: {
  messageId: string;   // الـ Message record اللي اتحفظ pending
  userId: string;
  contactId: string;
  toPhone: string;
  content: string;
  whatsappAccountId: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<void> {
  const {
    messageId, userId, contactId, toPhone, content,
    whatsappAccountId, phoneNumberId, accessToken,
  } = params;

  await prisma.messageQueue.create({
    data: {
      userId,
      whatsappAccountId,
      phoneNumberId,
      toPhone,
      contactId,
      messageType: "text",
      content,
      scheduledAt: new Date(),
      status: QueueStatus.pending,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// triggerScheduledCampaigns: تفعيل الحملات المجدولة التي حان وقتها
// ═══════════════════════════════════════════════════════════════════════════════
export async function triggerScheduledCampaigns(): Promise<number> {
  const now = new Date();

  // جيب الحملات المجدولة التي حان وقتها
  const due = await prisma.campaign.findMany({
    where: {
      status: CampaignStatus.scheduled,
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  if (due.length === 0) return 0;

  // حوّل رسائلها من scheduledAt مستقبلي لـ now
  for (const campaign of due) {
    await prisma.$transaction([
      prisma.messageQueue.updateMany({
        where: {
          campaignId: campaign.id,
          status: QueueStatus.pending,
        },
        data: {
          scheduledAt: now,
        },
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: CampaignStatus.running, startedAt: now },
      }),
    ]);
  }

  return due.length;
}