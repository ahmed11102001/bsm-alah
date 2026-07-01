// src/inngest/automation-cron-functions.ts
// ─── Cron Functions for Automation Rules ─────────────────────────────────────
//
//  1. noReplyCron   — يومياً الساعة 9 ص: يبعت قالب للعملاء الصامتين X يوم
//  2. timeBasedCron — كل ساعة: يبعت قالب لو الساعة واليوم بيطابقوا القاعدة
//
// كلاهما يستخدم sendWhatsAppMessage مباشرة (مش عبر campaign queue)
// لأنهما أتمتة فردية وليست حملة جماعية.

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { decryptToken } from "@/lib/crypto";
import { notifySubscriptionExpiring, notifyWhatsAppTokenExpiring, notifyAiTokensLow } from "@/lib/notifications";

// ─── Constants (string literals بدل enum لتجنب مشاكل prisma generate) ────────
const QueueStatus = { sent: "sent", failed: "failed" } as const;
const MessageStatus = { sent: "sent", failed: "failed" } as const;
const MessageDirection = { outbound: "outbound" } as const;
const MessageType = { template: "template" } as const;

// ─── Helper: أرسل قالب لجهة اتصال وسجّل الرسالة ──────────────────────────
async function sendTemplateToContact({
  userId, contactId, phone, template, account, ruleId,
}: {
  userId: string;
  contactId: string;
  phone: string;
  template: { id: string; name: string; language: string };
  account: { accessToken: string; phoneNumberId: string };
  ruleId: string;
}) {
  const result = await sendWhatsAppMessage({
    toPhone: phone,
    phoneNumberId: account.phoneNumberId,
    accessToken: decryptToken(account.accessToken),
    messageType: "template",
    templateName: template.name,
    templateLang: template.language ?? "ar",
    templateVars: null,
    content: null,
  });

  // سجّل النتيجة في جدول الرسائل — بدون تحديث lastMessageAt (بيتحدّث بس لما العميل يرد)
  await prisma.message.create({
    data: {
      userId,
      contactId,
      content: `[أتمتة] ${template.name}`,
      type: MessageType.template,
      direction: MessageDirection.outbound,
      status: result.ok ? MessageStatus.sent : MessageStatus.failed,
      whatsappId: result.ok ? result.whatsappMsgId : null,
      error: result.ok ? null : (result.error ?? "فشل الإرسال"),
      sentAt: result.ok ? new Date() : null,
      // نخزّن ruleId في metadata لو الـ schema بيدعمها، وإلا نتجاهل
    },
  }).catch(() => { }); // لو فشل التسجيل ما يوقفش الباقي

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 1: noReplyCron
// يشتغل كل يوم الساعة 9 صباحاً (UTC)
// يجيب كل قواعد NO_REPLY المفعّلة ويبعت قالب للعملاء الصامتين
// ═══════════════════════════════════════════════════════════════════════════════
export const noReplyCron = inngest.createFunction(
  {
    id: "automation-no-reply-cron",
    retries: 1,
    triggers: [{ cron: "0 7 * * *" }], // 7 UTC = 9 Cairo (UTC+2)
  },
  async ({ step }: { step: any }) => {

    // ── Step 1: جيب كل قواعد NO_REPLY المفعّلة ───────────────────────────────
    const rules = await step.run("get-no-reply-rules", async () => {
      return await prisma.automationRule.findMany({
        where: { triggerType: "NO_REPLY", isEnabled: true },
        select: {
          id: true, userId: true, triggerValue: true, templateId: true,
          user: {
            select: {
              whatsappAccount: {
                select: { accessToken: true, phoneNumberId: true },
              },
            },
          },
        },
      });
    });

    if (rules.length === 0) return { processed: 0 };

    let totalSent = 0;
    let totalFailed = 0;

    // ── Step 2: لكل قاعدة، جيب العملاء الصامتين وابعتلهم ────────────────────
    for (const rule of rules) {
      const account = rule.user?.whatsappAccount;
      if (!account || !rule.templateId) continue;

      const silentDays = parseInt(rule.triggerValue ?? "3", 10);
      if (!silentDays || silentDays < 1) continue;

      const cutoffDate = new Date(Date.now() - silentDays * 24 * 60 * 60 * 1000);

      // جيب القالب
      const template = await step.run(`get-template-${rule.id}`, async () => {
        return await prisma.template.findFirst({
          where: { id: rule.templateId!, userId: rule.userId },
          select: { id: true, name: true, language: true, status: true },
        });
      });

      if (!template || template.status?.toLowerCase() !== "approved") continue;

      // جيب جهات الاتصال الصامتة:
      // - آخر رسالة كانت قبل cutoffDate
      // - ما اتبعتلهاش أتمتة متابعة من نفس القاعدة اليوم
      const contacts = await step.run(`get-silent-contacts-${rule.id}`, async () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // جيب ids اللي اتبعتلهم من نفس القاعدة النهارده
        const alreadySentToday = await prisma.message.findMany({
          where: {
            userId: rule.userId,
            direction: "outbound",
            content: { contains: `[أتمتة] ${template.name}` },
            sentAt: { gte: todayStart },
          },
          select: { contactId: true },
        });
        const excludeIds = alreadySentToday.map(m => m.contactId).filter(Boolean) as string[];

        return await prisma.contact.findMany({
          where: {
            userId: rule.userId,
            deletedAt: null,
            lastMessageAt: { lte: cutoffDate, not: null },
            id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
          },
          select: { id: true, phone: true },
          take: 500, // حماية من الكميات الكبيرة
        });
      });

      if (contacts.length === 0) continue;

      // ابعت لكل جهة اتصال
      const { sent, failed } = await step.run(`send-no-reply-${rule.id}`, async () => {
        let sent = 0; let failed = 0;
        for (const contact of contacts) {
          const result = await sendTemplateToContact({
            userId: rule.userId,
            contactId: contact.id,
            phone: contact.phone,
            template: { id: template.id, name: template.name, language: template.language ?? "ar" },
            account,
            ruleId: rule.id,
          });
          if (result.ok) sent++;
          else failed++;

          // delay بسيط بين الرسائل لتجنب rate limit
          await new Promise(r => setTimeout(r, 300));
        }
        return { sent, failed };
      });

      totalSent += sent;
      totalFailed += failed;
    }

    return { totalSent, totalFailed, rulesProcessed: rules.length };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 2: timeBasedCron
// يشتغل كل ساعة
// يبعت قالب لو اليوم والساعة بيطابقوا القاعدة الزمنية
// ═══════════════════════════════════════════════════════════════════════════════
export const timeBasedCron = inngest.createFunction(
  {
    id: "automation-time-based-cron",
    retries: 1,
    triggers: [{ cron: "5 * * * *" }], // كل ساعة عند :05
  },
  async ({ step }: { step: any }) => {

    // ─── الوقت الحالي (Cairo = UTC+2) ──────────────────────────────────────
    const nowUtc = new Date();
    const nowCairo = new Date(nowUtc.getTime() + 2 * 60 * 60 * 1000); // +2 ساعة
    const currentHour = nowCairo.getUTCHours();
    const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][nowCairo.getUTCDay()];
    const currentMin = nowCairo.getUTCMinutes();

    // بنشتغل بس لو الدقائق بين 0-20 (أول ربع ساعة بعد بداية الساعة)
    if (currentMin > 20) return { skipped: true, reason: "Not in first 20 minutes of hour" };

    // ── Step 1: جيب كل قواعد TIME_BASED المفعّلة ─────────────────────────────
    const rules = await step.run("get-time-rules", async () => {
      return await prisma.automationRule.findMany({
        where: { triggerType: "TIME_BASED", isEnabled: true },
        select: {
          id: true, userId: true, triggerValue: true, templateId: true,
          user: {
            select: {
              whatsappAccount: {
                select: { accessToken: true, phoneNumberId: true },
              },
            },
          },
        },
      });
    });

    if (rules.length === 0) return { processed: 0 };

    let totalSent = 0;
    let totalFailed = 0;
    const matchedRules: string[] = [];

    for (const rule of rules) {
      // ─── parse triggerValue ─────────────────────────────────────────────
      let schedDays: string[] = [];
      let schedHour = -1;
      let audienceId = "";
      let maxContacts = 1000;
      try {
        const parsed = JSON.parse(rule.triggerValue ?? "{}");
        schedDays = parsed.days ?? [];
        schedHour = parseInt(parsed.hour ?? "-1", 10);
        audienceId = parsed.audienceId ?? "";
        maxContacts = parseInt(parsed.maxContacts ?? "1000", 10) || 1000;
      } catch { continue; }

      // ─── تحقق من التطابق ────────────────────────────────────────────────
      if (!schedDays.includes(currentDay)) continue;
      if (schedHour !== currentHour) continue;

      matchedRules.push(rule.id);

      const account = rule.user?.whatsappAccount;
      if (!account || !rule.templateId) continue;

      // ─── جيب القالب ─────────────────────────────────────────────────────
      const template = await step.run(`get-template-tb-${rule.id}`, async () => {
        return await prisma.template.findFirst({
          where: { id: rule.templateId!, userId: rule.userId },
          select: { id: true, name: true, language: true, status: true },
        });
      });

      if (!template || template.status?.toLowerCase() !== "approved") continue;

      // ─── جيب جهات الاتصال من الجمهور المحدد ────────────────────────────
      const contacts = await step.run(`get-contacts-tb-${rule.id}`, async () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // ما تبعتش للناس اللي اتبعتلهم نفس القالب النهارده
        const alreadySentToday = await prisma.message.findMany({
          where: {
            userId: rule.userId,
            direction: "outbound",
            content: { contains: `[أتمتة] ${template.name}` },
            sentAt: { gte: todayStart },
          },
          select: { contactId: true },
        });
        const excludeIds = alreadySentToday.map(m => m.contactId).filter(Boolean) as string[];

        // لو في audienceId محدد — جيب الكونتاكتس منه فقط
        if (audienceId) {
          const audience = await prisma.audience.findFirst({
            where: { id: audienceId, userId: rule.userId },
            select: {
              contacts: {
                where: {
                  deletedAt: null,
                  ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
                },
                select: { id: true, phone: true },
              },
            },
          });

          const all = audience?.contacts ?? [];
          // عشوائي + حد أقصى
          return all
            .sort(() => Math.random() - 0.5)
            .slice(0, maxContacts);
        }

        // fallback لو مفيش audienceId (قواعد قديمة) — كل الكونتاكتس مع الحد الأقصى
        const all = await prisma.contact.findMany({
          where: {
            userId: rule.userId,
            deletedAt: null,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
          },
          select: { id: true, phone: true },
        });
        return all
          .sort(() => Math.random() - 0.5)
          .slice(0, maxContacts);
      });

      if (contacts.length === 0) continue;

      // ─── ابعت لكل جهة اتصال ─────────────────────────────────────────────
      const { sent, failed } = await step.run(`send-timebased-${rule.id}`, async () => {
        let sent = 0; let failed = 0;
        for (const contact of contacts) {
          const result = await sendTemplateToContact({
            userId: rule.userId,
            contactId: contact.id,
            phone: contact.phone,
            template: { id: template.id, name: template.name, language: template.language ?? "ar" },
            account,
            ruleId: rule.id,
          });
          if (result.ok) sent++;
          else failed++;
          await new Promise(r => setTimeout(r, 300));
        }
        return { sent, failed };
      });

      totalSent += sent;
      totalFailed += failed;
    }

    return {
      totalSent, totalFailed,
      matchedRules,
      currentDay, currentHour,
    };
  }
);
// ═══════════════════════════════════════════════════════════════════════════════
// monthly-reset: تصفير عدادات الباقات — كل أول الشهر الساعة 00:00
// ═══════════════════════════════════════════════════════════════════════════════
export const monthlyPlanReset = inngest.createFunction(
  {
    id: "monthly-plan-reset",
    name: "Monthly Plan Reset",
    triggers: [{ cron: "0 0 1 * *" }], // أول يوم كل شهر الساعة 12 منتصف الليل
  },
  async ({ step }) => {
    const now = new Date();

    // ── Step 1: Downgrade المشتركين اللي خلص اشتراكهم → free ─────────────────
    // لازم يتعمل الأول عشان العدادات الجديدة تبدأ على الباقة الصح
    const downgradeResult = await step.run("downgrade-expired-subscriptions", async () => {
      const updated = await prisma.subscription.updateMany({
        where: {
          // الاشتراك عنده تاريخ انتهاء وعدى
          currentPeriodEnd: { lt: now },
          // بس اللي لسه active — مش اللي اتعالجوا قبل كده
          status: "active",
          // مش باقة free (free مفيهاش currentPeriodEnd)
          plan: { not: "free" },
        },
        data: {
          plan: "free",
          status: "expired",
        },
      });
      return { downgradedCount: updated.count };
    });

    console.log(`[MONTHLY-RESET] Downgraded ${downgradeResult.downgradedCount} expired subscriptions → free`);

    // ── Step 2: تصفير عدادات الشهر لكل المشتركين النشطين ────────────────────
    const resetResult = await step.run("reset-campaigns-counter", async () => {
      const updated = await prisma.subscription.updateMany({
        where: { status: "active" }, // بس النشطين — المنتهيين اتعملوا downgrade فوق
        data: {
          campaignsUsedThisMonth: 0,
          mcpCommandsUsedThisMonth: 0,
          aiTokensUsedThisMonth: 0,
          periodResetAt: now,
        },
      });
      return { updatedSubscriptions: updated.count };
    });

    // الـ contacts مش بنمسحهم — checkContactsLimit بتعد من الـ DB مباشرة
    console.log(`[MONTHLY-RESET] Done — reset ${resetResult.updatedSubscriptions} active subscriptions`);

    return {
      downgradedCount: downgradeResult.downgradedCount,
      updatedSubscriptions: resetResult.updatedSubscriptions,
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 4: subscriptionExpiryWarning
// يومياً الساعة 9 صباحاً: تحذير انتهاء الباقة
// ═══════════════════════════════════════════════════════════════════════════════
export const subscriptionExpiryWarning = inngest.createFunction(
  {
    id: "automation-subscription-expiry-warning",
    retries: 1,
    triggers: [{ cron: "0 7 * * *" }], // 7 UTC = 9 Cairo
  },
  async ({ step }) => {
    const targetDateStart = new Date();
    targetDateStart.setUTCDate(targetDateStart.getUTCDate() + 2);
    targetDateStart.setUTCHours(0, 0, 0, 0);

    const targetDateEnd = new Date(targetDateStart);
    targetDateEnd.setUTCDate(targetDateEnd.getUTCDate() + 1);

    const subscriptions = await step.run("get-expiring-subscriptions", async () => {
      return await prisma.subscription.findMany({
        where: {
          status: "active",
          plan: { not: "free" },
          currentPeriodEnd: {
            gte: targetDateStart,
            lt: targetDateEnd,
          },
          OR: [
            { expiryWarningSentAt: null },
            { expiryWarningSentAt: { lt: targetDateStart } },
          ],
        },
        select: { id: true, userId: true, plan: true },
      });
    });

    if (subscriptions.length === 0) return { processed: 0 };

    await step.run("send-expiry-warnings", async () => {
      for (const sub of subscriptions) {
        await notifySubscriptionExpiring(sub.userId, sub.plan, 2);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { expiryWarningSentAt: new Date() },
        });
      }
    });

    return { processed: subscriptions.length };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 5: whatsappTokenExpiryCheck
// يومياً الساعة 10 صباحاً: تحذير انتهاء توكن واتساب (Meta)
// ═══════════════════════════════════════════════════════════════════════════════
export const whatsappTokenExpiryCheck = inngest.createFunction(
  {
    id: "automation-whatsapp-token-expiry-check",
    retries: 1,
    triggers: [{ cron: "0 8 * * *" }], // 8 UTC = 10 Cairo
  },
  async ({ step }) => {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 50);

    const accounts = await step.run("get-expiring-whatsapp-tokens", async () => {
      return await prisma.whatsAppAccount.findMany({
        where: {
          updatedAt: { lte: cutoffDate }, // آخر تحديث من 50 يوم أو أقدم
        },
        select: { id: true, userId: true, updatedAt: true },
      });
    });

    if (accounts.length === 0) return { processed: 0 };

    await step.run("send-token-expiry-warnings", async () => {
      for (const acc of accounts) {
        const diffMs = Date.now() - new Date(acc.updatedAt).getTime();
        const daysSinceUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 60 - daysSinceUpdate);
        await notifyWhatsAppTokenExpiring(acc.userId, daysLeft);
      }
    });

    return { processed: accounts.length };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 6: aiTokensLowCheck
// يومياً الساعة 11 صباحاً: تحذير انخفاض رصيد الذكاء الاصطناعي
// ═══════════════════════════════════════════════════════════════════════════════
export const aiTokensLowCheck = inngest.createFunction(
  {
    id: "automation-ai-tokens-low-check",
    retries: 1,
    triggers: [{ cron: "0 9 * * *" }], // 9 UTC = 11 Cairo
  },
  async ({ step }) => {
    const subscriptions = await step.run("get-low-ai-tokens-subs", async () => {
      return await prisma.subscription.findMany({
        where: {
          status: "active",
        },
        select: { id: true, userId: true, plan: true, aiTokensUsedThisMonth: true },
      });
    });

    let processed = 0;

    await step.run("send-ai-tokens-low-warnings", async () => {
      for (const sub of subscriptions) {
        let aiTokensLimit = 0;
        switch (sub.plan) {
          case "starter": aiTokensLimit = 0; break;
          case "pro": aiTokensLimit = 0; break;
          case "enterprise": aiTokensLimit = 1_000_000; break;
        }

        if (aiTokensLimit > 0) {
          const usedPct = (sub.aiTokensUsedThisMonth / aiTokensLimit) * 100;
          if (usedPct >= 85) {
             // To prevent sending multiple times a month, we check if we already sent it
             // Here we just send it if it's over 85%. Ideally we'd have a flag like aiTokensLowWarningSentAt.
             // For now we'll just send the notification.
             // In a real app we'd add `aiTokensLowWarningSentAt` to the Subscription model.
             // Since we didn't add it, we will just rely on the user seeing it. Let's send only once by looking at Notification history.
             const recentWarning = await prisma.notification.findFirst({
                where: {
                  userId: sub.userId,
                  type: "AI_TOKENS_LOW",
                  createdAt: { gte: new Date(new Date().setDate(1)) } // beginning of month
                }
             });
             
             if (!recentWarning) {
               await notifyAiTokensLow(sub.userId, Math.round(usedPct));
               processed++;
             }
          }
        }
      }
    });

    return { processed };
  }
);