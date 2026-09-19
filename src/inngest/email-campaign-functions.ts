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
import { emailEligibilityWhere } from "@/lib/email-marketing/eligibility";

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

      // جلب جهات الاتصال النشطة المؤهلة (عندها إيميل، ومش UNSUBSCRIBED/BOUNCED)
      const whereContacts: any = emailEligibilityWhere(userId);
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

    // ── Step 2: المعالجة على دفعات — كل رسالة لوحدها step.run مستقلة ───────────
    // ليه كده؟ Inngest بيعمل memoization لكل step.run بناءً على الـid بتاعه:
    // لو نفس الـid اتنفذ قبل كده بنجاح، مش هيتنفذ تاني حتى لو الفنكشن كله
    // اتعاد (بعد فشل/إعادة محاولة). لما كانت كل الدفعة (chunk) جوه step.run
    // واحد، فشل في نص الدفعة كان معناه إعادة إرسال الرسايل اللي فعلاً نجحت
    // في نفس المحاولة اللي فشلت. دلوقتي كل رسالة لوحدها step.run بـid ثابت
    // (send-delivery-<id>) — لو الفنكشن وقع بعد نجاح 3 من أصل 10، إعادة
    // المحاولة هتلاقي التلاتة دول memoized وتكمل من الرابعة بس.
    //
    // جلب القالب مرة واحدة قبل الحلقة (مش بيتغير أثناء الإرسال).
    const campaignData = await step.run("get-campaign-template", async () => {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: { template: true },
      });
      if (!campaign || !campaign.template) {
        throw new Error("بيانات الحملة أو القالب مفقودة أثناء الإرسال");
      }
      return {
        subject: campaign.subject,
        bodyHtml: campaign.template.bodyHtml,
        previewText: campaign.template.previewText,
      };
    });

    let hasMore = true;
    let chunkIndex = 0;

    while (hasMore) {
      // fetch خفيف بس — بيرجع أول CHUNK_SIZE رسالة لسه QUEUED. مفيش حاجة
      // لـcursor: الرسايل اللي اتعالجت بيتغير status بتاعها فعليًا في الـDB،
      // فكل مرة الاستعلام ده بيرجع الدفعة الجاية تلقائيًا.
      const pendingDeliveries = await step.run(`fetch-chunk-${chunkIndex}`, async () => {
        return prisma.emailDelivery.findMany({
          where: { campaignId, status: "QUEUED" },
          take: CHUNK_SIZE,
          orderBy: { createdAt: "asc" },
          select: { id: true, contactId: true, contactEmail: true, contactName: true },
        });
      });

      if (pendingDeliveries.length === 0) {
        hasMore = false;
        break;
      }

      for (const delivery of pendingDeliveries) {
        // كل رسالة لوحدها — النتيجة لازم تكون serializable (زي القديمة بالظبط)
        const result: { success: boolean; error?: string } = await step.run(
          `send-delivery-${delivery.id}`,
          async () => {
            // ── حارس idempotency: لو محاولة سابقة من نفس الـ step نجحت وسجّلت
            // في الـ DB (Inngest replay/memoization جزئي)، لا نعيد الإرسال —
            // نرجع النتيجة المسجلة بدل ما نبعت duplicate ونزوّد العداد مرتين.
            const current = await prisma.emailDelivery.findUnique({
              where: { id: delivery.id },
              select: { status: true },
            });
            if (
              current?.status === "SENT" ||
              current?.status === "DELIVERED" ||
              current?.status === "OPENED"
            ) {
              return { success: true };
            }
            if (current?.status === "FAILED") {
              return { success: false, error: "مسجلة FAILED مسبقًا — تم تخطي إعادة الإرسال" };
            }

            // Message-ID ثابت لنفس الـ delivery — محاولات الإعادة تحمل نفس
            // الـ ID (يُسهّل dedup عند المستلم ويظهر في الـ logs).
            const deterministicMessageId = `<${delivery.id}@email.aiwni>`;

            let sendResult: { success: boolean; error?: string };
            try {
              sendResult = await sendEmailViaUserSmtp(userId, {
                to: delivery.contactEmail,
                recipientName: delivery.contactName,
                subject: campaignData.subject,
                html: campaignData.bodyHtml,
                previewText: campaignData.previewText,
                contactId: delivery.contactId ?? undefined,
                messageId: deterministicMessageId,
              });
            } catch (err: any) {
              sendResult = { success: false, error: err?.message || "خطأ تقني أثناء الإرسال" };
            }

            // ⚠️ حدود الضمان الصريحة: SMTP وPostgres ليسا transaction واحدة —
            // لا توجد exactly-once عبر الشبكة. لو الـ SMTP قَبِل الرسالة ثم
            // فشل تسجيل النتيجة في الـ DB، الـ step بيفشل وInngest بيعيد
            // المحاولة، والمحاولة الجديدة قد ترسل duplicate (نفس Message-ID).
            // ما يضمنه هذا الـ step فعليًا:
            //  1) نجاح مسجّل لا يُعاد إرساله (الحارس أعلاه)،
            //  2) تحديث حالة الرسالة + عداد الحملة ذريًا في transaction واحدة
            //     (لا نجاح جزئي ملوّث بعداد متكرر).
            // SENT هنا = "قَبِلها SMTP" (accepted) — وليست "استلمها المستلم"
            // (DELIVERED الحقيقية لا تأتي إلا عبر delivery webhook لاحقًا).
            if (sendResult.success) {
              try {
                await prisma.$transaction([
                  prisma.emailDelivery.update({
                    where: { id: delivery.id },
                    data: { status: "SENT", sentAt: new Date(), errorMessage: null },
                  }),
                  prisma.emailCampaign.update({
                    where: { id: campaignId },
                    data: { sentCount: { increment: 1 } },
                  }),
                ]);
              } catch (dbErr: any) {
                // أخطر حالة: SMTP قَبِل الرسالة فعلًا لكن التسجيل فشل —
                // نسجّلها بوضوح بدل ما نبتلعها، لأن إعادة المحاولة قد تكرر الإرسال.
                console.error(
                  `[processEmailCampaign] SMTP accepted delivery ${delivery.id} but DB persist failed — retry may duplicate (same Message-ID ${deterministicMessageId}):`,
                  dbErr
                );
                throw dbErr;
              }
              return { success: true };
            }

            await prisma.$transaction([
              prisma.emailDelivery.update({
                where: { id: delivery.id },
                data: {
                  status: "FAILED",
                  errorMessage: sendResult.error || "فشل الإرسال عبر خادم البريد",
                  sentAt: new Date(),
                },
              }),
              prisma.emailCampaign.update({
                where: { id: campaignId },
                data: { sentCount: { increment: 1 }, failedCount: { increment: 1 } },
              }),
            ]);
            return { success: false, error: sendResult.error };
          }
        );
        void result; // العداد اتحدّث فعليًا جوه الـstep نفسه (transaction) — هنا بس عشان النوع
      }

      if (pendingDeliveries.length < CHUNK_SIZE) hasMore = false;
      else chunkIndex++;
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

      // SENT = قَبِلها SMTP (accepted) — ليست DELIVERED حقيقية. DELIVERED لا
      // تُسجَّل إلا عبر delivery webhook لاحقًا (إن وُجد). sentCount = إجمالي
      // المحاولات، failedCount = الفاشلة، والـ accepted الضمني = sent - failed.
      const deliveredCount = statsMap["DELIVERED"] || 0;
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
