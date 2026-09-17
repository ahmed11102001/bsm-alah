// src/inngest/email-campaign-functions.ts
// ─── Inngest Functions for Email Marketing Campaigns ──────────────────────────
// بديل آمن للإرسال المباشر جوه الـ HTTP Request
// - لا يتأثر بـ Timeout الخاص بـ Vercel / Serverless Functions
// - إرسال على دفعات (Chunks) مع Automatic Retry لكل دفعة
// - الحفاظ على تقدم الحملة (Progress) لحظة بلحظة في الـ Database
// - منع احتكار الـ SMTP عبر Concurrency Limits لكل مستخدم

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendEmailViaUserSmtp } from "@/lib/email-marketing/sender";

const CHUNK_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. processEmailCampaign (Execution Processor)
// ═══════════════════════════════════════════════════════════════════════════════
export const processEmailCampaign = inngest.createFunction(
  {
    id: "process-email-campaign",
    retries: 2,
    concurrency: [
      { limit: 5 },                                // السعة المتزامنة الإجمالية للمنصة
      { limit: 1, key: "event.data.userId" },      // حملة واحدة نشطة لكل مستخدم في نفس الوقت لحماية الـ SMTP
    ],
    triggers: [{ event: "email/campaign.send" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, userId } = event.data as {
      campaignId: string;
      userId: string;
    };

    // ── Step 1: التحقق وتجهيز قائمة المستلمين وسجلات التسليم ────────────────────
    const prep = await step.run("prepare-recipients", async () => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id: campaignId, userId },
        include: { template: true },
      });

      if (!campaign || !campaign.template) {
        throw new Error(`حملة البريد ${campaignId} أو قالبها غير موجود`);
      }

      if (campaign.status === "COMPLETED") {
        return { alreadyCompleted: true, total: campaign.targetCount };
      }

      // جلب جهات الاتصال النشطة المؤهلة — CRM Contact with email
      const whereContacts: any = {
        userId,
        email: { not: null },
        emailStatus: "SUBSCRIBED",
      };
      if (campaign.targetTag) {
        whereContacts.tags = { has: campaign.targetTag };
      }

      const contacts = await prisma.contact.findMany({
        where: whereContacts,
        select: { id: true, email: true, name: true },
      });

      if (contacts.length === 0) {
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            status: "COMPLETED",
            targetCount: 0,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            completedAt: new Date(),
          },
        });
        return { empty: true, total: 0, alreadyCompleted: false };
      }

      // تحديث حالة الحملة إلى SENDING
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "SENDING",
          targetCount: contacts.length,
        },
      });

      // التحقق من وجود سجلات سابقة (في حال استئناف العمل)
      const existingCount = await prisma.emailDelivery.count({
        where: { campaignId },
      });

      if (existingCount === 0) {
        await prisma.emailDelivery.createMany({
          data: contacts.map((c: { id: string; email: string | null; name: string | null }) => ({
            campaignId,
            contactId: c.id,
            contactEmail: c.email!,     // guaranteed non-null by filter
            contactName: c.name || null, // Snapshot from CRM Contact
            status: "QUEUED",
          })),
        });
      }

      return { empty: false, total: contacts.length, alreadyCompleted: false };

    });

    if (prep.alreadyCompleted || prep.empty) {
      return { success: true, total: prep.total, completed: true };
    }

    // ── Step 2: المعالجة على دفعات (Chunks) لضمان عدم حدوث Timeout ─────────────
    let hasMore = true;
    let chunkIndex = 0;

    while (hasMore) {
      const chunkResult = await step.run(`send-chunk-${chunkIndex}`, async () => {
        // جلب الرسائل التي لم يتم تسليمها بعد
        const pendingDeliveries = await prisma.emailDelivery.findMany({
          where: {
            campaignId,
            status: "QUEUED",
          },
          take: CHUNK_SIZE,
          orderBy: { createdAt: "asc" },
        });

        if (pendingDeliveries.length === 0) {
          return { done: true, processed: 0, delivered: 0, failed: 0 };
        }

        const campaign = await prisma.emailCampaign.findUnique({
          where: { id: campaignId },
          include: { template: true },
        });

        if (!campaign || !campaign.template) {
          throw new Error("بيانات الحملة أو القالب مفقودة أثناء الإرسال");
        }

        let chunkDelivered = 0;
        let chunkFailed = 0;

        for (const delivery of pendingDeliveries) {
          try {
            const sendResult = await sendEmailViaUserSmtp(userId, {
              to: delivery.contactEmail,
              recipientName: delivery.contactName,
              subject: campaign.subject,
              html: campaign.template.bodyHtml,
              previewText: campaign.template.previewText,
            });

            if (sendResult.success) {
              chunkDelivered++;
              await prisma.emailDelivery.update({
                where: { id: delivery.id },
                data: {
                  status: "SENT",
                  sentAt: new Date(),
                  errorMessage: null,
                },
              });
            } else {
              chunkFailed++;
              await prisma.emailDelivery.update({
                where: { id: delivery.id },
                data: {
                  status: "FAILED",
                  errorMessage: sendResult.error || "فشل الإرسال عبر خادم البريد",
                  sentAt: new Date(),
                },
              });
            }
          } catch (err: any) {
            chunkFailed++;
            await prisma.emailDelivery.update({
              where: { id: delivery.id },
              data: {
                status: "FAILED",
                errorMessage: err?.message || "خطأ تقني أثناء الإرسال",
                sentAt: new Date(),
              },
            });
          }
        }

        // تحديث تقدم الحملة تراكميًا
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            sentCount: { increment: pendingDeliveries.length },
            deliveredCount: { increment: chunkDelivered },
            failedCount: { increment: chunkFailed },
          },
        });

        return {
          done: pendingDeliveries.length < CHUNK_SIZE,
          processed: pendingDeliveries.length,
          delivered: chunkDelivered,
          failed: chunkFailed,
        };
      });

      if (chunkResult.done) {
        hasMore = false;
      } else {
        chunkIndex++;
      }
    }

    // ── Step 3: إنهاء الحملة وتوثيق النتائج النهائية ────────────────────────────
    return await step.run("finalize-campaign", async () => {
      const finalStats = await prisma.emailDelivery.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: { id: true },
      });

      const statsMap = Object.fromEntries(
        finalStats.map((s) => [s.status, s._count.id])
      );

      const deliveredCount =
        (statsMap["DELIVERED"] || 0) + (statsMap["SENT"] || 0);
      const failedCount = statsMap["FAILED"] || 0;
      const totalCount = Object.values(statsMap).reduce((a, b) => a + b, 0);

      const finalStatus =
        failedCount === totalCount && totalCount > 0 ? "FAILED" : "COMPLETED";

      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: finalStatus,
          sentCount: totalCount,
          deliveredCount,
          failedCount,
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        campaignId,
        total: totalCount,
        delivered: deliveredCount,
        failed: failedCount,
        status: finalStatus,
      };
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. scheduleEmailCampaign (Scheduling Handler)
// ═══════════════════════════════════════════════════════════════════════════════
export const scheduleEmailCampaign = inngest.createFunction(
  {
    id: "schedule-email-campaign",
    retries: 2,
    triggers: [{ event: "email/campaign.schedule" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, scheduledAt, userId } = event.data as {
      campaignId: string;
      scheduledAt: string;
      userId: string;
    };

    if (scheduledAt) {
      await step.sleepUntil("wait-for-email-schedule", new Date(scheduledAt));
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign || campaign.status === "COMPLETED") {
      return { skipped: true };
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "QUEUED" },
    });

    await step.sendEvent("dispatch-email-campaign-send", {
      name: "email/campaign.send",
      data: { campaignId, userId },
    });

    return { scheduled: true, dispatchedAt: new Date().toISOString() };
  }
);
