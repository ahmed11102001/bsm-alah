// src/inngest/functions.ts
// ─── Inngest Functions ────────────────────────────────────────────────────────
// بديل احترافي للـ Cron Job — كل حملة بتشتغل في مسارها الخاص
// بدون Timeout + Automatic Retry + Built-in Scheduling

import { inngest }   from "./client";
import prisma        from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";

// ─── String literals بدل الـ enums (تعمل بدون prisma generate محلياً) ────────
const QueueStatus      = { pending: "pending", sent: "sent", failed: "failed" } as const;
const CampaignStatus   = { running: "running", completed: "completed", scheduled: "scheduled" } as const;
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

    // ── Step 3: جيب كل الرسائل المعلقة ──────────────────────────────────────
    const messages = await step.run("get-pending-messages", async () => {
      return await prisma.messageQueue.findMany({
        where: {
          campaignId,
          status: QueueStatus.pending,
        },
        orderBy: { scheduledAt: "asc" },
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
          attempts:         true,
          maxAttempts:      true,
          existingMessageId: true,
          phoneNumberId:    true,
          whatsappAccountId: true,
        },
      });
    });

    if (messages.length === 0) {
      // مفيش رسائل — اكمل الحملة
      await step.run("complete-empty", async () => {
        await prisma.campaign.update({
          where: { id: campaignId },
          data:  { status: CampaignStatus.completed, completedAt: new Date() },
        });
      });
      return { sent: 0, failed: 0 };
    }

    // ── Step 4: إرسال كل رسالة (كل رسالة = step مستقل = retry منفصل) ──────────
    let sent   = 0;
    let failed = 0;
    let tokenError = false;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // لو التوكن باظ — وقف الحملة
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
          accessToken:   account.accessToken,
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
                  update: { lastMessageAt: new Date() },
                  create: { phone: msg.toPhone, userId: msg.userId, lastMessageAt: new Date() },
                });

            if (contact) {
              await tx.message.create({
                data: {
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
              await tx.contact.update({
                where: { id: contact.id },
                data:  { lastMessageAt: new Date() },
              });
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

          // ✅ إشعار فوري للعميل
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

      if (result.ok)            sent++;
      else if (result.isTokenError) { tokenError = true; failed++; }
      else if (!result.isRateLimit) failed++;

      // delay بين الرسائل (مش في آخر رسالة)
      if (i < messages.length - 1 && !tokenError) {
        await step.sleep(`delay-${i}`, "350ms");
      }
    }

    // ── Step 5: اكمل الحملة وابعت إشعار ──────────────────────────────────────
    await step.run("complete-campaign", async () => {
      await prisma.campaign.update({
        where: { id: campaignId },
        data:  { status: CampaignStatus.completed, completedAt: new Date() },
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
      } catch (err) {
        console.error("[INNGEST] Notification error:", err);
      }
    });

    return { sent, failed, total: messages.length };
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
        accessToken:   item.whatsappAccount!.accessToken,
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
            prisma.message.update({
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
          await prisma.message.update({
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