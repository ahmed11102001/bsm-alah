// src/lib/queue.ts
// ─── محرك الـ Queue الأساسي ────────────────────────────────────────────────────
// هذا الملف هو القلب — يُستدعى من الـ Cron ومن أي مكان آخر يحتاج إرسال

import prisma from "@/lib/prisma";
import { QueueStatus, CampaignStatus, MessageDirection, MessageStatus, MessageType } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────

// حد الإرسال اليومي لكل Tier
const TIER_DAILY_LIMIT: Record<number, number> = {
  1: 1_000,
  2: 10_000,
  3: 100_000,
  4: Infinity,
};

// كام رسالة نبعت في كل batch حسب الـ Tier
const TIER_BATCH_SIZE: Record<number, number> = {
  1: 10,
  2: 30,
  3: 80,
  4: 150,
};

// وقت الانتظار بين الرسائل (ms)
const DELAY_BETWEEN_MSGS = 350;

// backoff مراحل (بالثواني)
const BACKOFF_STEPS_SEC = [60, 300, 900, 3600]; // 1m, 5m, 15m, 1h

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendResult {
  ok:           boolean;
  whatsappMsgId?: string;
  error?:       string;
  isRateLimit?: boolean; // Meta رجّعت 429
  isTokenError?: boolean; // التوكن باظ
}

interface ProcessResult {
  processed: number;
  sent:      number;
  failed:    number;
  skipped:   number; // تم تخطيها بسبب backoff أو حد يومي
}

// ─── Helper: delay ────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Helper: إعادة تصفير العداد اليومي لو تغير اليوم ────────────────────────
async function resetDailyCounterIfNeeded(accountId: string, resetAt: Date) {
  const now   = new Date();
  const reset = new Date(resetAt);
  if (
    now.getUTCDate()  !== reset.getUTCDate()  ||
    now.getUTCMonth() !== reset.getUTCMonth() ||
    now.getUTCFullYear() !== reset.getUTCFullYear()
  ) {
    await prisma.whatsAppAccount.update({
      where: { id: accountId },
      data:  { dailySentCount: 0, dailyResetAt: now },
    });
    return 0;
  }
  return null;
}

// ─── Core: إرسال رسالة واحدة عبر Meta API ────────────────────────────────────
async function sendOneMessage(item: {
  toPhone:      string;
  phoneNumberId: string;
  accessToken:  string;
  messageType:  string;
  templateName: string | null;
  templateLang: string;
  templateVars: any;
  content:      string | null;
}): Promise<SendResult> {
  let payload: object;

  if (item.messageType === "template" && item.templateName) {
    // ── قالب ──────────────────────────────────────────────────────────────────
    const components: object[] = [];
    if (item.templateVars && Array.isArray(item.templateVars.body)) {
      components.push({
        type: "body",
        parameters: item.templateVars.body.map((v: string) => ({
          type: "text", text: v,
        })),
      });
    }

    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              "template",
      template: {
        name:       item.templateName,
        language:   { code: item.templateLang },
        components: components.length ? components : undefined,
      },
    };

  } else if (item.messageType === "media" && item.content) {
    // ── ميديا (image / video / audio / document) ──────────────────────────────
    // content بيتخزن بصيغة "mediaType:mediaId"  مثلاً "image:12345678"
    const colonIdx = item.content.indexOf(":");
    const mediaType = colonIdx > -1 ? item.content.slice(0, colonIdx) : "document";
    const mediaId   = colonIdx > -1 ? item.content.slice(colonIdx + 1) : item.content;

    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              mediaType,
      [mediaType]:       { id: mediaId },
    };

  } else {
    // ── نص عادي ───────────────────────────────────────────────────────────────
    payload = {
      messaging_product: "whatsapp",
      to:                item.toPhone,
      type:              "text",
      text:              { body: item.content ?? "" },
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${item.phoneNumberId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${item.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    // Rate limit (429)
    if (res.status === 429 || data?.error?.code === 80007) {
      return { ok: false, isRateLimit: true, error: "Rate limit — 429" };
    }

    // Token error
    if (data?.error?.code === 190 || data?.error?.code === 200) {
      return { ok: false, isTokenError: true, error: data.error.message };
    }

    // أي error آخر من Meta
    if (data?.error) {
      return { ok: false, error: data.error.message };
    }

    return {
      ok:            true,
      whatsappMsgId: data.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Network error" };
  }
}

// ─── handleRateLimit: تفعيل الـ Backoff على الرقم ───────────────────────────
async function applyBackoff(accountId: string, currentCount: number) {
  const step    = Math.min(currentCount, BACKOFF_STEPS_SEC.length - 1);
  const seconds = BACKOFF_STEPS_SEC[step];
  const until   = new Date(Date.now() + seconds * 1000);

  await prisma.whatsAppAccount.update({
    where: { id: accountId },
    data:  {
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
    data:  { backoffUntil: null, backoffCount: 0 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// الدالة الرئيسية: processQueue
// ═══════════════════════════════════════════════════════════════════════════════
export async function processQueue(): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  const now = new Date();

  // ── حد زمني: نرجع قبل Vercel يقتل الـ function ──────────────────────────────
  // Free plan = 10s، Pro = 300s — بنحسب من startTime ونوقف عند 8s أماناً
  const BUDGET_MS  = Number(process.env.QUEUE_BUDGET_MS ?? 8000);
  const deadline   = Date.now() + BUDGET_MS;

  // ── Step 1: جيب كل الـ accounts النشطة (مش في backoff) ─────────────────────
  const accounts = await prisma.whatsAppAccount.findMany({
    where: {
      OR: [
        { backoffUntil: null },
        { backoffUntil: { lte: now } }, // انتهى الـ backoff
      ],
    },
    select: {
      id:             true,
      phoneNumberId:  true,
      accessToken:    true,
      messagingTier:  true,
      dailySentCount: true,
      dailyResetAt:   true,
      backoffCount:   true,
    },
  });

  if (accounts.length === 0) return result;

  // ── Step 2: لكل account، خذ batch من الـ pending messages ───────────────────
  for (const account of accounts) {
    // تصفير العداد اليومي لو لزم
    let dailySent = account.dailySentCount;
    const resetResult = await resetDailyCounterIfNeeded(account.id, account.dailyResetAt);
    if (resetResult !== null) dailySent = 0;

    // حد يومي
    const dailyLimit = TIER_DAILY_LIMIT[account.messagingTier] ?? 1000;
    if (dailySent >= dailyLimit) {
      result.skipped++;
      console.log(`[QUEUE] Account ${account.id} reached daily limit (${dailySent}/${dailyLimit})`);
      continue;
    }

    const batchSize = Math.min(
      TIER_BATCH_SIZE[account.messagingTier] ?? 10,
      dailyLimit - dailySent
    );

    // ── Atomic: احجز الـ batch ────────────────────────────────────────────────
    const batch = await prisma.$transaction(async (tx) => {
      const items = await tx.messageQueue.findMany({
        where: {
          phoneNumberId: account.phoneNumberId,
          status:        QueueStatus.pending,
          scheduledAt:   { lte: now },
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } },
          ],
        },
        orderBy: { scheduledAt: "asc" },
        take:    batchSize,
        select: {
          id:                true,
          userId:            true,
          whatsappAccountId: true,
          toPhone:           true,
          contactId:         true,
          messageType:       true,
          templateName:      true,
          templateLang:      true,
          templateVars:      true,
          content:           true,
          campaignId:        true,
          attempts:          true,
          maxAttempts:       true,
          phoneNumberId:     true,
          existingMessageId: true,
        },
      });

      if (items.length === 0) return [];

      // غير الحالة لـ processing فوراً (يمنع التكرار)
      await tx.messageQueue.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data:  { status: QueueStatus.processing, processedAt: now },
      });

      return items;
    });

    if (batch.length === 0) continue;

    let accountRateLimited = false;

    // ── إرسال كل رسالة في الـ batch ──────────────────────────────────────────
    for (const item of batch) {
      result.processed++;

      if (accountRateLimited) {
        // لو الرقم تبلك — ارجع باقي الرسائل لـ pending
        await prisma.messageQueue.update({
          where: { id: item.id },
          data:  {
            status:      QueueStatus.pending,
            processedAt: null,
            nextRetryAt: new Date(Date.now() + 60_000),
          },
        });
        result.skipped++;
        continue;
      }

      // ── توقف لو اقتربنا من نهاية الـ budget ─────────────────────────────────
      if (Date.now() > deadline) {
        console.log(`[QUEUE] Budget exhausted after ${result.sent} sent — will resume next cron`);
        break;
      }

      const sendResult = await sendOneMessage({
        toPhone:         item.toPhone,
        phoneNumberId:   item.phoneNumberId,
        accessToken:     account.accessToken,
        messageType:     item.messageType,
        templateName:    item.templateName,
        templateLang:    item.templateLang,
        templateVars:    item.templateVars,
        content:         item.content,
      });

      if (sendResult.ok) {
        // ── نجاح ──
        result.sent++;

        await prisma.$transaction(async (tx) => {
          // 1. حدّث الـ queue record
          await tx.messageQueue.update({
            where: { id: item.id },
            data:  {
              status:        QueueStatus.sent,
              whatsappMsgId: sendResult.whatsappMsgId,
              sentAt:        new Date(),
              attempts:      { increment: 1 },
            },
          });

          // 2. أنشئ أو حدّث Message record للمحادثات
          const contact = item.contactId
            ? await tx.contact.findFirst({ where: { id: item.contactId }, select: { id: true } })
            : await tx.contact.upsert({
                where:  { phone_userId: { phone: item.toPhone, userId: item.userId } },
                update: { lastMessageAt: new Date() },
                create: { phone: item.toPhone, userId: item.userId, lastMessageAt: new Date() },
              });

          if (contact) {
            if (item.existingMessageId) {
              // رسالة Chat فردية — حدّث الـ pending record الموجود
              await tx.message.update({
                where: { id: item.existingMessageId },
                data: {
                  status:     MessageStatus.sent,
                  whatsappId: sendResult.whatsappMsgId,
                  sentAt:     new Date(),
                },
              });
            } else {
              // رسالة حملة — أنشئ record جديد
              await tx.message.create({
                data: {
                  userId:     item.userId,
                  contactId:  contact.id,
                  campaignId: item.campaignId ?? undefined,
                  content:    item.templateName ? `[قالب] ${item.templateName}` : item.content,
                  type:       MessageType.template,
                  direction:  MessageDirection.outbound,
                  status:     MessageStatus.sent,
                  whatsappId: sendResult.whatsappMsgId,
                  sentAt:     new Date(),
                },
              });
            }

            // تحديث آخر رسالة للكونتاكت
            await tx.contact.update({
              where: { id: contact.id },
              data:  { lastMessageAt: new Date() },
            });
          }

          // 3. تحديث عداد الحملة + تحقق من اكتمالها فوراً
          if (item.campaignId) {
            const updated = await tx.campaign.update({
              where: { id: item.campaignId },
              data:  { sentCount: { increment: 1 }, queuedCount: { decrement: 1 } },
              select: { queuedCount: true, status: true },
            });

            // تحقق فعلي من الداتابيز — أأمن من الاعتماد على queuedCount
            const remaining = await tx.messageQueue.count({
              where: {
                campaignId: item.campaignId,
                status: { in: [QueueStatus.pending, QueueStatus.processing] },
              },
            });

            if (remaining === 0 && updated.status === CampaignStatus.running) {
              await tx.campaign.update({
                where: { id: item.campaignId },
                data:  { status: CampaignStatus.completed, completedAt: new Date() },
              });
            }
          }

          // 4. تحديث العداد اليومي للـ account
          await tx.whatsAppAccount.update({
            where: { id: item.whatsappAccountId },
            data:  { dailySentCount: { increment: 1 } },
          });
        });

        // تصفير الـ backoff بعد نجاح
        if (account.backoffCount > 0) {
          await clearBackoff(account.id);
        }

      } else if (sendResult.isRateLimit) {
        // ── Rate Limited ──
        result.skipped++;
        accountRateLimited = true;

        await applyBackoff(account.id, account.backoffCount);

        // ارجع الرسالة لـ pending مع nextRetryAt
        const retryAfter = BACKOFF_STEPS_SEC[
          Math.min(account.backoffCount, BACKOFF_STEPS_SEC.length - 1)
        ] * 1000;

        await prisma.messageQueue.update({
          where: { id: item.id },
          data:  {
            status:      QueueStatus.pending,
            processedAt: null,
            nextRetryAt: new Date(Date.now() + retryAfter),
            attempts:    { increment: 1 },
          },
        });

      } else if (sendResult.isTokenError) {
        // ── Token Error: أوقف كل رسائل هذا الـ account ──
        result.failed++;
        accountRateLimited = true; // يوقف الـ batch

        // فشل نهائي لهذه الرسالة
        await prisma.messageQueue.update({
          where: { id: item.id },
          data:  {
            status:   QueueStatus.failed,
            error:    sendResult.error,
            attempts: { increment: 1 },
          },
        });

        // TODO: إشعار العميل بأن التوكن انتهى صلاحيته
        console.error(`[QUEUE] Token error for account ${account.id}: ${sendResult.error}`);

      } else {
        // ── فشل عادي (قابل للإعادة) ──
        result.failed++;
        const newAttempts = item.attempts + 1;
        const isFinal     = newAttempts >= item.maxAttempts;

        await prisma.$transaction(async (tx) => {
          await tx.messageQueue.update({
            where: { id: item.id },
            data: {
              status:      isFinal ? QueueStatus.failed : QueueStatus.pending,
              error:       sendResult.error,
              attempts:    { increment: 1 },
              nextRetryAt: isFinal ? null : new Date(Date.now() + 5 * 60_000), // retry بعد 5 دقائق
              processedAt: null,
            },
          });

          // لو فشل نهائي → حدّث الـ Message بحالة failed
          if (isFinal) {
            if (item.existingMessageId) {
              // رسالة Chat — حدّث الـ pending record
              await tx.message.update({
                where: { id: item.existingMessageId },
                data:  { status: MessageStatus.failed, error: sendResult.error },
              });
            } else if (item.contactId && item.campaignId) {
              // رسالة حملة — حدّث عداد الفشل
              await tx.campaign.update({
                where: { id: item.campaignId },
                data:  { failedCount: { increment: 1 }, queuedCount: { decrement: 1 } },
              });
            }
          }
        });
      }

      // delay بين الرسائل (يحاكي السلوك البشري)
      if (!accountRateLimited) {
        await delay(DELAY_BETWEEN_MSGS);
      }
    }

  }

  return result;
}

// ─── checkAndCompleteCampaigns: إغلاق الحملات المكتملة ─────────────────────
async function checkAndCompleteCampaigns(campaignIds: string[]) {
  if (campaignIds.length === 0) return;
  const unique = [...new Set(campaignIds)];

  for (const id of unique) {
    const campaign = await prisma.campaign.findUnique({
      where:  { id },
      select: { queuedCount: true, status: true },
    });
    if (!campaign) continue;
    if (campaign.status !== CampaignStatus.running) continue;

    if (campaign.queuedCount <= 0) {
      await prisma.campaign.update({
        where: { id },
        data:  { status: CampaignStatus.completed, completedAt: new Date() },
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// enqueueCampaign: إضافة حملة للـ Queue (يُستدعى من campaigns/route.ts)
// ═══════════════════════════════════════════════════════════════════════════════
export async function enqueueCampaign(params: {
  campaignId:   string;
  userId:       string;
  numbers:      string[];
  templateName: string;
  templateLang?: string;
  templateVars?: any;
  scheduledAt?: Date | null;
  whatsappAccountId: string;
  phoneNumberId:     string;
  accessToken:       string;
}): Promise<{ queued: number }> {
  const {
    campaignId, userId, numbers, templateName,
    templateLang = "ar", templateVars, scheduledAt,
    whatsappAccountId, phoneNumberId, accessToken,
  } = params;

  const sendAt = scheduledAt ?? new Date();

  // إنشاء الـ queue records دفعة واحدة
  const data = numbers.map((phone) => ({
    userId,
    whatsappAccountId,
    phoneNumberId,
    toPhone:     phone,
    messageType: "template",
    templateName,
    templateLang,
    templateVars: templateVars ?? undefined,
    campaignId,
    scheduledAt: sendAt,
    status:      QueueStatus.pending,
  }));

  // createMany لأداء أفضل
  await prisma.messageQueue.createMany({ data, skipDuplicates: false });

  // تحديث حالة الحملة
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status:       scheduledAt ? CampaignStatus.scheduled : CampaignStatus.running,
      totalQueued:  numbers.length,
      queuedCount:  numbers.length,
      startedAt:    scheduledAt ? null : new Date(),
      scheduledAt:  scheduledAt ?? null,
    },
  });

  return { queued: numbers.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// enqueueDirectMessage: رسالة chat فردية → Queue (بدل fire-and-forget)
// الـ Cron هيبعتها خلال أقل من دقيقة مع نفس الـ rate-limit وbackoff logic
// ═══════════════════════════════════════════════════════════════════════════════
export async function enqueueDirectMessage(params: {
  messageId:        string;   // الـ Message record اللي اتحفظ pending
  userId:           string;
  contactId:        string;
  toPhone:          string;
  content:          string;
  whatsappAccountId: string;
  phoneNumberId:    string;
  accessToken:      string;
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
      messageType:      "text",
      content,
      scheduledAt:      new Date(),
      status:           QueueStatus.pending,
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
      status:      CampaignStatus.scheduled,
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
          status:     QueueStatus.pending,
        },
        data: {
          scheduledAt: now,
        },
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data:  { status: CampaignStatus.running, startedAt: now },
      }),
    ]);
  }

  return due.length;
}