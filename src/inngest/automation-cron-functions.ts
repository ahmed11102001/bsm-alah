// src/inngest/automation-cron-functions.ts
// ─── Cron Functions for Automation Rules ─────────────────────────────────────
//
//  1. timeBasedCron — كل ساعة: يبعت قالب لو الساعة واليوم بيطابقوا القاعدة
//
// بيستخدم sendWhatsAppMessage مباشرة (مش عبر campaign queue)
// لأنه أتمتة فردية وليست حملة جماعية.

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { DEVELOPERS_BASE_URL } from "@/lib/dev-links";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { decryptToken } from "@/lib/crypto";
import { notifySubscriptionExpiring, notifyWhatsAppTokenExpiring, notifyWhatsAppTokenExpired, notifyWhatsAppTokenInvalid, notifyAiTokensLow } from "@/lib/notifications";
import { checkWhatsAppAccountToken, WhatsAppTokenStatus, TokenCheckUnavailableError } from "@/lib/whatsapp-token";

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
    userId,
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
// expire-subscriptions-daily: تصفير الباقات المنتهية → free (يوميًا)
// ═══════════════════════════════════════════════════════════════════════════════
// ملاحظة: صلاحيات الميزات فعليًا بتتقفل فورًا لحظة انتهاء currentPeriodEnd عن
// طريق getEffectivePlan()/getSubscription() في src/lib/plan-guard.ts (self-healing
// عند أول تحقق صلاحيات)، فمفيش فجوة أمنية هنا حتى لو الـcron ده اتأخر. الغرض من
// الـcron ده إنه يلحق بالمستخدمين اللي مش بيعملوا أي طلب محتاج تحقق صلاحيات (يعني
// مش هيتلاقى fallback في plan-guard.ts) عشان الـDB وواجهات الأدمن تفضل متزامنة بسرعة
// معقولة (خلال ٢٤ ساعة كحد أقصى) بدل ما تستنى أول الشهر الجاي.
export const expireSubscriptionsDaily = inngest.createFunction(
  {
    id: "expire-subscriptions-daily",
    name: "Expire Subscriptions Daily",
    triggers: [{ cron: "0 1 * * *" }], // كل يوم الساعة 1 صباحًا (بعد التذكيرات بساعة)
  },
  async ({ step }) => {
    const now = new Date();

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

    console.log(`[EXPIRE-DAILY] Downgraded ${downgradeResult.downgradedCount} expired subscriptions → free`);

    return { downgradedCount: downgradeResult.downgradedCount };
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// usage-counters-reset: تصفير عدادات الاستهلاك — كل يوزر له دورة 30 يوم مستقلة
// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ ملحوظة مهمة: ده كان قبل كده بيشتغل مرة واحدة أول كل شهر ميلادي ويصفّر
// عدادات كل المشتركين النشطين مع بعض دفعة واحدة (`0 0 1 * *`) — بغض النظر عن
// تاريخ اشتراك كل واحد فيهم الفعلي. ده كان معناه لو حد اشترك يوم 20 من الشهر،
// عداده هيتصفر بعد 10 أيام بس (أول الشهر الجاي)، مش بعد 30 يوم من اشتراكه.
//
// دلوقتي بقى الـcron ده بيشتغل **يوميًا** ويدور بس على المشتركين اللي عدت
// عليهم 30 يوم فعلية من آخر تصفير خاص بيهم (`periodResetAt`) — كل واحد له
// دورته الخاصة المرتبطة بتاريخ اشتراكه/آخر استخدام، مش متزامنة مع الشهر
// الميلادي. المصدر الأساسي لتصفير العداد فعليًا هو الـSelf-healing في
// resetMonthlyCounterIfNeeded (src/lib/plan-guard.ts) عند أول تحقق صلاحيات
// بعد انتهاء الـ30 يوم — الـcron ده مجرد شبكة أمان زي expireSubscriptionsDaily
// فوق، عشان يلحق باليوزرز اللي مش بيعملوا أي طلب يفعّل الـSelf-healing.
const USAGE_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

export const usageCountersResetDaily = inngest.createFunction(
  {
    id: "usage-counters-reset-daily",
    name: "Usage Counters Reset (30-day per-user cycle)",
    triggers: [{ cron: "0 2 * * *" }], // يوميًا الساعة 2 صباحًا (بعد expire-subscriptions-daily)
  },
  async ({ step }) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - USAGE_CYCLE_MS);

    // بس المشتركين اللي عدت عليهم 30 يوم من آخر تصفير — كل واحد بتاريخه الخاص
    const resetResult = await step.run("reset-usage-counters-per-user", async () => {
      const updated = await prisma.subscription.updateMany({
        where: {
          status: "active",
          periodResetAt: { lte: cutoff },
        },
        data: {
          campaignsUsedThisMonth: 0,
          mcpCommandsUsedThisMonth: 0,
          aiTokensUsedThisMonth: 0,
          periodResetAt: now,
        },
      });
      return { updatedSubscriptions: updated.count };
    });

    // ── شبكة أمان إضافية: تصفير رصيد التوكنز الإضافي (bonus) اللي عدّت
    // عليه 30 يوم من تاريخ شراؤه (aiTokensBonusExpiresAt) — نفس فكرة
    // expireBonusTokensIfNeeded في src/lib/plan-guard.ts بس هنا بتشمل حتى
    // اليوزرز اللي مش بيعملوا أي طلب AI يفعّل الـSelf-healing.
    const bonusExpiryResult = await step.run("expire-bonus-tokens", async () => {
      const updated = await prisma.subscription.updateMany({
        where: {
          aiTokensBonusBalance: { gt: 0 },
          aiTokensBonusExpiresAt: { lt: now },
        },
        data: {
          aiTokensBonusBalance: 0,
          aiTokensBonusExpiresAt: null,
        },
      });
      return { expiredCount: updated.count };
    });

    // الـ contacts مش بنمسحهم — checkContactsLimit بتعد من الـ DB مباشرة
    console.log(
      `[USAGE-RESET] Reset ${resetResult.updatedSubscriptions} subscriptions (30-day cycle), expired bonus tokens for ${bonusExpiryResult.expiredCount} subscriptions`
    );

    return {
      updatedSubscriptions: resetResult.updatedSubscriptions,
      expiredBonusCount: bonusExpiryResult.expiredCount,
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
export const ownerPlanRenewalCheck = inngest.createFunction(
  {
    id: "owner-plan-renewal-check",
    retries: 1,
    triggers: [{ cron: "0 8 * * *" }], // 8 UTC = 10 Cairo
  },
  async ({ step }) => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringSoon = await step.run("get-expiring-soon-projects", async () => {
      return await prisma.developerProject.findMany({
        where: {
          plan: "OWNER_PLAN",
          planRenewsAt: { lte: threeDaysFromNow, gt: now },
          planExpiringNotifiedAt: null,
        },
        select: { id: true, name: true, ownerId: true },
      });
    });

    for (const project of expiringSoon) {
      await prisma.developerNotification.create({
        data: {
          developerId: project.ownerId!,
          type: "PLAN_EXPIRING_SOON",
          title: "تذكير بتجديد الباقة",
          message: `يتبقى 3 أيام على انتهاء باقة مشروع "${project.name}".`,
          link: `${DEVELOPERS_BASE_URL}/portal/projects/${project.id}/billing`,
        },
      });
      await prisma.developerProject.update({
        where: { id: project.id },
        data: { planExpiringNotifiedAt: now },
      });
    }

    const justExpired = await step.run("get-just-expired-projects", async () => {
      return await prisma.developerProject.findMany({
        where: {
          plan: "OWNER_PLAN",
          planRenewsAt: { lt: now },
          planExpiredNotifiedAt: null,
        },
        select: { id: true, name: true, ownerId: true },
      });
    });

    for (const project of justExpired) {
      await prisma.developerNotification.create({
        data: {
          developerId: project.ownerId!,
          type: "PLAN_EXPIRED",
          title: "انتهت باقة الأونر",
          message: `انتهت باقة مشروع "${project.name}" وتوقف إرسال رسائل OTP حتى التجديد.`,
          link: `${DEVELOPERS_BASE_URL}/portal/projects/${project.id}/billing`,
        },
      });
      await prisma.developerProject.update({
        where: { id: project.id },
        data: { planExpiredNotifiedAt: now },
      });
    }

    return { processed: expiringSoon.length + justExpired.length };
  }
);

export const whatsappTokenExpiryCheck = inngest.createFunction(
  {
    id: "automation-whatsapp-token-expiry-check",
    retries: 1,
    triggers: [{ cron: "0 8 * * *" }], // 8 UTC = 10 Cairo
  },
  async ({ step }) => {
    const checkCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const accounts = await step.run("get-whatsapp-tokens-due-for-check", async () => {
      return await prisma.whatsAppAccount.findMany({
        where: {
          tokenStatus: { notIn: ["INVALID", "EXPIRED"] },
          OR: [
            { lastTokenCheckAt: null },
            { lastTokenCheckAt: { lte: checkCutoff } },
          ],
        },
        select: {
          id: true, userId: true, accessToken: true, tokenStatus: true,
          tokenWarning7SentAt: true, tokenWarning3SentAt: true,
          tokenWarning1SentAt: true, tokenExpiredNotifiedAt: true,
          tokenInvalidNotifiedAt: true,
        },
      });
    });

    if (accounts.length === 0) return { processed: 0 };

    let checked = 0;
    let skipped = 0;
    for (const acc of accounts) {
      const result = await step.run(`debug-whatsapp-token-${acc.id}`, async () => {
        try {
          return await checkWhatsAppAccountToken(acc);
        } catch (error) {
          if (!(error instanceof TokenCheckUnavailableError)) {
            console.error(`[WHATSAPP TOKEN] debug_token failed for account ${acc.id}:`, error);
          }
          return null;
        }
      });
      if (!result) { skipped++; continue; }
      checked++;

      const status = result.updated.tokenStatus as string;
      if (status === WhatsAppTokenStatus.INVALID) {
        const claim = await prisma.whatsAppAccount.updateMany({
          where: { id: acc.id, tokenInvalidNotifiedAt: null },
          data: { tokenInvalidNotifiedAt: new Date() },
        });
        if (claim.count) await notifyWhatsAppTokenInvalid(acc.userId);
        continue;
      }
      if (status === WhatsAppTokenStatus.EXPIRED) {
        const claim = await prisma.whatsAppAccount.updateMany({
          where: { id: acc.id, tokenExpiredNotifiedAt: null },
          data: { tokenExpiredNotifiedAt: new Date() },
        });
        if (claim.count) await notifyWhatsAppTokenExpired(acc.userId);
        continue;
      }
      if (status !== WhatsAppTokenStatus.EXPIRING_SOON) continue;

      const expiryValues = [result.updated.tokenExpiresAt, result.updated.tokenDataAccessExpiresAt]
        .filter(Boolean)
        .map(value => new Date(value as string | Date));
      const expiry = expiryValues.sort((a, b) => a.getTime() - b.getTime())[0];
      if (!expiry) continue;
      const daysLeft = Math.max(1, Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      const threshold = daysLeft <= 1 ? 1 : daysLeft <= 3 ? 3 : 7;
      const sentField = threshold === 1 ? "tokenWarning1SentAt" : threshold === 3 ? "tokenWarning3SentAt" : "tokenWarning7SentAt";
      const claim = await prisma.whatsAppAccount.updateMany({
        where: { id: acc.id, [sentField]: null },
        data: { [sentField]: new Date() },
      });
      if (claim.count) {
        await notifyWhatsAppTokenExpiring(acc.userId, threshold);
      }
    }

    return { processed: accounts.length, checked, skipped };
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
