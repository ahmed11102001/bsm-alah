// src/inngest/functions.ts
// ─── Inngest Functions ────────────────────────────────────────────────────────
// بديل احترافي للـ Cron Job — كل حملة بتشتغل في مسارها الخاص
// بدون Timeout + Automatic Retry + Built-in Scheduling

import { inngest }   from "./client";
import prisma        from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { decryptToken }        from "@/lib/crypto";
import * as Sentry from "@sentry/nextjs";

// ─── حجم كل chunk من الرسائل ─────────────────────────────────────────────────
// بدل ما نجيب كل الحملة دفعة واحدة في الذاكرة، نجيب 200 رسالة بس في كل دورة.
// حملة بـ 20,000 رسالة → 100 دورة × 200 رسالة، كل دورة تمحي نفسها من الذاكرة
// قبل ما الجاية تبدأ.
const CAMPAIGN_CHUNK_SIZE = 200;

// ─── String literals بدل الـ enums (تعمل بدون prisma generate محلياً) ────────
const QueueStatus      = { pending: "pending", processing: "processing", sent: "sent", failed: "failed", cancelled: "cancelled" } as const;
const CampaignStatus   = { running: "running", completed: "completed", scheduled: "scheduled", failed: "failed" } as const;
const MessageStatus    = { sent: "sent", failed: "failed" } as const;
const MessageDirection = { outbound: "outbound" } as const;
const MessageType      = { template: "template" } as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Function 1: processCampaign
// ═══════════════════════════════════════════════════════════════════════════════
export const processCampaign = inngest.createFunction(
  {
    id:          "process-campaign",
    retries:     2,
    concurrency: { limit: 5 },
    triggers:    [{ event: "campaign/send" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, scheduledAt } = event.data as {
      campaignId:  string;
      scheduledAt: string | null;
    };

    // ── Step 0: لو مجدولة — استنى لحد الموعد ─────────────────────────────────
    if (scheduledAt) {
      await step.sleepUntil("wait-for-schedule", new Date(scheduledAt));
    }

    // ── Step 1: جيب بيانات الحملة والحساب ────────────────────────────────────
    const campaign = await step.run("get-campaign-data", async () => {
      return await prisma.campaign.findUnique({
        where:  { id: campaignId },
        select: {
          id:           true,
          name:         true,
          userId:       true,
          status:       true,
          queuedCount:  true,
          user: {
            select: {
              whatsappAccount: {
                select: {
                  id:            true,
                  accessToken:   true,
                  phoneNumberId: true,
                  messagingTier: true,
                  dailySentCount: true,
                  dailyResetAt:   true,
                  backoffCount:   true,
                  backoffUntil:   true,
                },
              },
            },
          },
        },
      });
    });

    if (!campaign)          throw new Error(`Campaign ${campaignId} not found`);
    if (!campaign.user?.whatsappAccount) throw new Error("No WhatsApp account linked");
    if (campaign.status === CampaignStatus.completed) return { skipped: true };

    const account = campaign.user.whatsappAccount;

    // ── Step 2: تحديث الحملة لـ running ──────────────────────────────────────
    await step.run("mark-running", async () => {
      await prisma.campaign.update({
        where: { id: campaignId },
        data:  { status: CampaignStatus.running, startedAt: new Date() },
      });
    });

    // ── Step 3+4: إرسال الرسائل بـ chunked cursor pagination ──────────────────
    //
    // ❌ النهج القديم (محذوف):
    //   findMany بدون take → يجيب 20,000 رسالة دفعة واحدة في الذاكرة
    //
    // ✅ النهج الجديد:
    //   نجيب CAMPAIGN_CHUNK_SIZE رسالة، نبعتهم، ثم نجيب الـ CHUNK التالية
    //   باستخدام cursor (آخر id في الـ chunk السابقة).
    //   الذاكرة المستخدمة = CAMPAIGN_CHUNK_SIZE رسالة بس في أي لحظة.
    //
    // مثال: حملة 20,000 رسالة
    //   قديم: 20,000 record في الذاكرة دفعة واحدة
    //   جديد: 200 record × 100 دورة — كل دورة تتحرر من الذاكرة قبل الجاية

    let sent       = 0;
    let failed     = 0;
    let tokenError = false;
    let chunkIndex = 0;           // رقم الـ chunk الحالية — بيدخل في اسم الـ step لضمان uniqueness
    let cursor: string | undefined; // id آخر عنصر في الـ chunk السابقة

    // ── حلقة الـ chunks ───────────────────────────────────────────────────────
    while (!tokenError) {
      const capturedCursor = cursor; // نسخة محلية للـ closure داخل step.run

      // جيب chunk واحدة بس من الـ DB
      const chunk = await step.run(`fetch-chunk-${chunkIndex}`, async () => {
        return prisma.messageQueue.findMany({
          where: {
            campaignId,
            status: QueueStatus.pending,
          },
          orderBy: { id: "asc" },   // ترتيب ثابت بالـ id لضمان cursor صحيح
          take:    CAMPAIGN_CHUNK_SIZE,
          ...(capturedCursor
            ? { cursor: { id: capturedCursor }, skip: 1 }
            : {}),
          select: {
            id:                true,
            userId:            true,
            toPhone:           true,
            contactId:         true,
            messageType:       true,
            templateName:      true,
            templateLang:      true,
            templateVars:      true,
            content:           true,
            attempts:          true,
            maxAttempts:       true,
            existingMessageId: true,
            phoneNumberId:     true,
            whatsappAccountId: true,
          },
        });
      });

      // مفيش رسائل (أول chunk فارغة = حملة فارغة تماماً)
      if (chunk.length === 0) {
        if (chunkIndex === 0) {
          await step.run("complete-empty", async () => {
            await prisma.campaign.update({
              where: { id: campaignId },
              data:  { status: CampaignStatus.completed, completedAt: new Date() },
            });
          });
          return { sent: 0, failed: 0 };
        }
        break; // الحملة خلصت
      }

      // ── إرسال رسائل الـ chunk ─────────────────────────────────────────────
      for (let i = 0; i < chunk.length; i++) {
        const msg = chunk[i];

        // لو التوكن باظ — اكتب failed لكل اللي تبقى وأوقف
        if (tokenError) {
          await step.run(`skip-token-error-${msg.id}`, async () => {
            await prisma.messageQueue.update({
              where: { id: msg.id },
              data:  { status: QueueStatus.failed, error: "Token error — campaign stopped" },
            });
          });
          failed++;
          continue;
        }

        // إرسال الرسالة
        const result = await step.run(`send-${msg.id}`, async () => {
          return await sendWhatsAppMessage({
            toPhone:       msg.toPhone,
            phoneNumberId: account.phoneNumberId,
            accessToken:   decryptToken(account.accessToken),
            messageType:   msg.messageType,
            templateName:  msg.templateName,
            templateLang:  msg.templateLang,
            templateVars:  msg.templateVars,
            content:       msg.content,
          });
        });

        // معالجة النتيجة
        await step.run(`handle-result-${msg.id}`, async () => {
          if (result.ok) {
            // ── نجاح ──
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              await tx.messageQueue.update({
                where: { id: msg.id },
                data: {
                  status:        QueueStatus.sent,
                  whatsappMsgId: result.whatsappMsgId,
                  sentAt:        new Date(),
                  attempts:      { increment: 1 },
                },
              });

              const contact = msg.contactId
                ? await tx.contact.findFirst({ where: { id: msg.contactId }, select: { id: true } })
                : await tx.contact.upsert({
                    where:  { phone_userId: { phone: msg.toPhone, userId: msg.userId } },
                    // لا نحدّث lastMessageAt عند الإرسال — بيتحدّث بس لما العميل يرد (inbound)
                    update: {},
                    create: { phone: msg.toPhone, userId: msg.userId },
                  });

              if (contact) {
                // upsert بدل create — يحمي من unique constraint لو wamid اتكرر
                await tx.message.upsert({
                  where:  { whatsappId: result.whatsappMsgId ?? `no-wamid-${Date.now()}` },
                  update: {},   // لو موجود بالفعل — لا تعمل حاجة
                  create: {
                    userId:     msg.userId,
                    contactId:  contact.id,
                    campaignId: campaignId,
                    content:    msg.templateName ? `[قالب] ${msg.templateName}` : msg.content,
                    type:       MessageType.template,
                    direction:  MessageDirection.outbound,
                    status:     MessageStatus.sent,
                    whatsappId: result.whatsappMsgId,
                    sentAt:     new Date(),
                  },
                });
                // ❌ لا نحدّث lastMessageAt هنا — بيتحدّث بس لما العميل يرد من الـ webhook
              }

              await tx.campaign.update({
                where: { id: campaignId },
                data:  { sentCount: { increment: 1 }, queuedCount: { decrement: 1 } },
              });

              await tx.whatsAppAccount.update({
                where: { id: msg.whatsappAccountId },
                data:  { dailySentCount: { increment: 1 } },
              });
            });

          } else if (result.isTokenError) {
            // ── Token Error: وقف الحملة + إشعار العميل ──
            await prisma.messageQueue.update({
              where: { id: msg.id },
              data:  { status: QueueStatus.failed, error: result.error, attempts: { increment: 1 } },
            });
            await prisma.campaign.update({
              where: { id: campaignId },
              data:  { failedCount: { increment: 1 }, queuedCount: { decrement: 1 } },
            });

            try {
              const { createNotification } = await import("@/lib/notifications");
              await createNotification({
                userId: campaign.userId,
                type:   "PLAN_LIMIT_REACHED" as any,
                title:  "⚠️ توكن واتساب انتهت صلاحيته",
                body:   `توقف إرسال حملة "${campaign.name}" — يرجى تحديث توكن واتساب`,
                link:   "/dashboard?section=api",
              });
            } catch {}

          } else if (result.isRateLimit) {
            // ── Rate Limit: ارجع الرسالة لـ pending وحاول بعد شوية ──
            await prisma.messageQueue.update({
              where: { id: msg.id },
              data: {
                status:      QueueStatus.pending,
                processedAt: null,
                nextRetryAt: new Date(Date.now() + 60_000),
                attempts:    { increment: 1 },
              },
            });

          } else {
            // ── فشل عادي ──
            const newAttempts = msg.attempts + 1;
            const isFinal     = newAttempts >= msg.maxAttempts;

            await prisma.messageQueue.update({
              where: { id: msg.id },
              data: {
                status:      isFinal ? QueueStatus.failed : QueueStatus.pending,
                error:       result.error,
                attempts:    { increment: 1 },
                nextRetryAt: isFinal ? null : new Date(Date.now() + 5 * 60_000),
              },
            });

            if (isFinal) {
              await prisma.campaign.update({
                where: { id: campaignId },
                data:  { failedCount: { increment: 1 }, queuedCount: { decrement: 1 } },
              });
            }
          }
        });

        if (result.ok)                { sent++; }
        else if (result.isTokenError) { tokenError = true; failed++; }
        else if (!result.isRateLimit) { failed++; }

        // delay بين الرسائل (مش في آخر رسالة في الـ chunk الأخيرة)
        const isLastInChunk = i === chunk.length - 1;
        const isLastChunk   = chunk.length < CAMPAIGN_CHUNK_SIZE;
        if (!(isLastInChunk && isLastChunk) && !tokenError) {
          await step.sleep(`delay-${chunkIndex}-${i}`, "350ms");
        }
      }

      // لو الـ chunk أقل من CHUNK_SIZE → ده كان آخر chunk → نطلع
      if (chunk.length < CAMPAIGN_CHUNK_SIZE) break;

      // حدّث الـ cursor لـ chunk الجاية
      cursor = chunk[chunk.length - 1].id;
      chunkIndex++;
    }

    // ── Step 5: اكمل الحملة وابعت إشعار ──────────────────────────────────────
    await step.run("complete-campaign", async () => {
      // لو مفيش ولا رسالة اتبعتت بنجاح → الحملة فشلت كلها
      const finalStatus = sent === 0
        ? CampaignStatus.failed
        : CampaignStatus.completed;

      await prisma.campaign.update({
        where: { id: campaignId },
        data:  { status: finalStatus, completedAt: new Date() },
      });

      try {
        const { notifyCampaignSuccess, notifyCampaignFailed, notifyCampaignPartial } =
          await import("@/lib/notifications");

        const userId = campaign.userId;
        const name   = campaign.name;

        if (failed === 0) {
          await notifyCampaignSuccess(userId, name, campaignId, sent);
        } else if (sent === 0) {
          await notifyCampaignFailed(userId, name, campaignId, failed);
        } else {
          await notifyCampaignPartial(userId, name, campaignId, sent, failed);
        }
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: "inngest", function: "send-campaign" },
        });
        console.error("[INNGEST] Notification error:", error);
        throw error; // مهم عشان Inngest يعتبر الـ job فشل
      }
    });

    return { sent, failed, total: sent + failed };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Function 2: sendDirectMessage
// ═══════════════════════════════════════════════════════════════════════════════
export const sendDirectMessage = inngest.createFunction(
  {
    id:       "send-direct-message",
    retries:  3,
    triggers: [{ event: "message/send" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { queueId } = event.data as { queueId: string };

    const item = await step.run("get-message", async () => {
      return await prisma.messageQueue.findUnique({
        where:  { id: queueId },
        select: {
          id:               true,
          userId:           true,
          toPhone:          true,
          contactId:        true,
          messageType:      true,
          templateName:     true,
          templateLang:     true,
          templateVars:     true,
          content:          true,
          existingMessageId: true,
          whatsappAccountId: true,
          whatsappAccount: {
            select: { accessToken: true, phoneNumberId: true },
          },
        },
      });
    });

    if (!item || !item.whatsappAccount) throw new Error("Queue item not found");

    const result = await step.run("send-message", async () => {
      return await sendWhatsAppMessage({
        toPhone:       item.toPhone,
        phoneNumberId: item.whatsappAccount!.phoneNumberId,
        accessToken:   decryptToken(item.whatsappAccount!.accessToken),
        messageType:   item.messageType,
        templateName:  item.templateName,
        templateLang:  item.templateLang,
        templateVars:  item.templateVars,
        content:       item.content,
      });
    });

    await step.run("update-status", async () => {
      if (result.ok) {
        await prisma.$transaction([
          prisma.messageQueue.update({
            where: { id: item.id },
            data: {
              status:        QueueStatus.sent,
              whatsappMsgId: result.whatsappMsgId,
              sentAt:        new Date(),
              attempts:      { increment: 1 },
            },
          }),
          ...(item.existingMessageId ? [
            prisma.message.updateMany({
              where: { id: item.existingMessageId },
              data:  { status: MessageStatus.sent, whatsappId: result.whatsappMsgId, sentAt: new Date() },
            }),
          ] : []),
        ]);
      } else {
        await prisma.messageQueue.update({
          where: { id: item.id },
          data:  { status: QueueStatus.failed, error: result.error, attempts: { increment: 1 } },
        });
        if (item.existingMessageId) {
          await prisma.message.updateMany({
            where: { id: item.existingMessageId },
            data:  { status: MessageStatus.failed, error: result.error },
          });
        }
        if (!result.ok) throw new Error(result.error); // Inngest هيعيد المحاولة
      }
    });

    return { ok: result.ok };
  }
);
// ═══════════════════════════════════════════════════════════════════════════════
// Function 3: processQueueItem — معالجة رسالة واحدة من الـ Queue
// بيتستدعى من processQueue (fan-out) بدل الـ inline loop
// ═══════════════════════════════════════════════════════════════════════════════
export const processQueueItem = inngest.createFunction(
  {
    id:      "process-queue-item",
    retries: 2,
    triggers: [{ event: "queue/process-item" }],
    // حد الـ concurrency لكل phoneNumberId → مش بنفلود WhatsApp API
    concurrency: {
      limit: 3,
      key:   "event.data.phoneNumberId",
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { queueId } = event.data as { queueId: string };

    // ── Step 1: جيب الـ item وتحقق إنه لسه pending ────────────────────────────
    const item = await step.run("get-item", async () => {
      return prisma.messageQueue.findUnique({
        where:  { id: queueId },
        select: {
          id:               true,
          userId:           true,
          toPhone:          true,
          contactId:        true,
          phoneNumberId:    true,
          messageType:      true,
          templateName:     true,
          templateLang:     true,
          templateVars:     true,
          content:          true,
          campaignId:       true,
          attempts:         true,
          maxAttempts:      true,
          existingMessageId: true,
          status:           true,
          whatsappAccount: {
            select: {
              id:            true,
              accessToken:   true,
              phoneNumberId: true,
              backoffCount:  true,
              backoffUntil:  true,
              dailySentCount: true,
              dailyResetAt:  true,
              messagingTier: true,
            },
          },
        },
      });
    });

    // مش موجود أو اتأخذ بالفعل → تجاهل
    if (!item || item.status !== QueueStatus.pending) {
      return { skipped: true, reason: item?.status ?? "not_found" };
    }

    if (!item.whatsappAccount) {
      await prisma.messageQueue.update({
        where: { id: item.id },
        data:  { status: QueueStatus.failed, error: "WhatsApp account not found" },
      });
      return { skipped: true, reason: "no_account" };
    }

    const account = item.whatsappAccount;

    // ── تحقق من backoff ────────────────────────────────────────────────────────
    if (account.backoffUntil && account.backoffUntil > new Date()) {
      await prisma.messageQueue.update({
        where: { id: item.id },
        data:  { nextRetryAt: account.backoffUntil },
      });
      return { skipped: true, reason: "backoff" };
    }

    // ── Mark as processing (atomic — يمنع التكرار) ────────────────────────────
    const claimed = await step.run("claim-item", async () => {
      const res = await prisma.messageQueue.updateMany({
        where: { id: item.id, status: QueueStatus.pending },
        data:  { status: QueueStatus.processing, processedAt: new Date() },
      });
      return res.count === 1;
    });

    if (!claimed) return { skipped: true, reason: "already_claimed" };

    // ── Step 2: إرسال الرسالة ──────────────────────────────────────────────────
    const sendResult = await step.run("send-message", async () => {
      return sendWhatsAppMessage({
        toPhone:       item.toPhone,
        phoneNumberId: account.phoneNumberId,
        accessToken:   account.accessToken,
        messageType:   item.messageType,
        templateName:  item.templateName,
        templateLang:  item.templateLang,
        templateVars:  item.templateVars,
        content:       item.content,
      });
    });

    // ── Step 3: معالجة النتيجة ─────────────────────────────────────────────────
    await step.run("handle-result", async () => {
      if (sendResult.ok) {
        // ── نجاح ────────────────────────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.messageQueue.update({
            where: { id: item.id },
            data: {
              status:        QueueStatus.sent,
              whatsappMsgId: sendResult.whatsappMsgId,
              sentAt:        new Date(),
              attempts:      { increment: 1 },
            },
          });

          // Message record
          const contact = item.contactId
            ? await tx.contact.findFirst({ where: { id: item.contactId }, select: { id: true } })
            : await tx.contact.upsert({
                where:  { phone_userId: { phone: item.toPhone, userId: item.userId } },
                update: { lastMessageAt: new Date() },
                create: { phone: item.toPhone, userId: item.userId, lastMessageAt: new Date() },
              });

          if (contact) {
            if (item.existingMessageId) {
              await tx.message.update({
                where: { id: item.existingMessageId },
                data:  { status: MessageStatus.sent, whatsappId: sendResult.whatsappMsgId, sentAt: new Date() },
              });
            } else {
              await tx.message.upsert({
                where:  { whatsappId: sendResult.whatsappMsgId ?? `no-wamid-${Date.now()}` },
                update: {},
                create: {
                  userId:     item.userId,
                  contactId:  contact.id,
                  campaignId: item.campaignId ?? undefined,
                  content:    item.templateName ? `[قالب] ${item.templateName}` : (item.content ?? ""),
                  type:       MessageType.template,
                  direction:  MessageDirection.outbound,
                  status:     MessageStatus.sent,
                  whatsappId: sendResult.whatsappMsgId,
                  sentAt:     new Date(),
                },
              });
            }
            await tx.contact.update({
              where: { id: contact.id },
              data:  { lastMessageAt: new Date() },
            });
          }

          // تحديث عداد الحملة
          if (item.campaignId) {
            const updated = await tx.campaign.update({
              where: { id: item.campaignId },
              data:  { sentCount: { increment: 1 }, queuedCount: { decrement: 1 } },
              select: { queuedCount: true, status: true },
            });
            if (updated.queuedCount <= 0 && updated.status === CampaignStatus.running) {
              await tx.campaign.update({
                where: { id: item.campaignId },
                data:  { status: CampaignStatus.completed, completedAt: new Date() },
              });
            }
          }

          await tx.whatsAppAccount.update({
            where: { id: account.id },
            data:  { dailySentCount: { increment: 1 } },
          });
        });

      } else if (sendResult.isRateLimit) {
        // ── Rate Limited → backoff ───────────────────────────────────────────
        await prisma.whatsAppAccount.update({
          where: { id: account.id },
          data:  { backoffUntil: new Date(Date.now() + 60_000), backoffCount: { increment: 1 } },
        });
        await prisma.messageQueue.update({
          where: { id: item.id },
          data:  { status: QueueStatus.pending, processedAt: null, nextRetryAt: new Date(Date.now() + 60_000), attempts: { increment: 1 } },
        });

      } else {
        // ── فشل → retry أو failed نهائي ─────────────────────────────────────
        const newAttempts = item.attempts + 1;
        const isFinal     = newAttempts >= item.maxAttempts;
        await prisma.messageQueue.update({
          where: { id: item.id },
          data: {
            status:      isFinal ? QueueStatus.failed : QueueStatus.pending,
            error:       sendResult.error,
            attempts:    { increment: 1 },
            nextRetryAt: isFinal ? null : new Date(Date.now() + 5 * 60_000),
            processedAt: null,
          },
        });
        if (!isFinal) throw new Error(sendResult.error ?? "send failed"); // Inngest retry
      }
    });

    // ── Step 4: delay بين الرسائل على Inngest مش Vercel ──────────────────────
    if (sendResult.ok) {
      await step.sleep("rate-limit-delay", "350ms");
    }

    return { ok: sendResult.ok };
  }
);