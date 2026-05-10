// src/inngest/automation-cron-functions.ts
// ─── Cron Functions for Automation Rules ─────────────────────────────────────
//
//  1. noReplyCron   — يومياً الساعة 9 ص: يبعت قالب للعملاء الصامتين X يوم
//  2. timeBasedCron — كل ساعة: يبعت قالب لو الساعة واليوم بيطابقوا القاعدة
//
// كلاهما يستخدم sendWhatsAppMessage مباشرة (مش عبر campaign queue)
// لأنهما أتمتة فردية وليست حملة جماعية.

import { inngest }              from "./client";
import prisma                   from "@/lib/prisma";
import { sendWhatsAppMessage }  from "@/lib/whatsapp-api";

// ─── Constants (string literals بدل enum لتجنب مشاكل prisma generate) ────────
const QueueStatus      = { sent: "sent", failed: "failed" } as const;
const MessageStatus    = { sent: "sent", failed: "failed" } as const;
const MessageDirection = { outbound: "outbound" } as const;
const MessageType      = { template: "template" } as const;

// ─── Helper: أرسل قالب لجهة اتصال وسجّل الرسالة ──────────────────────────
async function sendTemplateToContact({
  userId, contactId, phone, template, account, ruleId,
}: {
  userId:    string;
  contactId: string;
  phone:     string;
  template:  { id: string; name: string; language: string };
  account:   { accessToken: string; phoneNumberId: string };
  ruleId:    string;
}) {
  const result = await sendWhatsAppMessage({
    toPhone:       phone,
    phoneNumberId: account.phoneNumberId,
    accessToken:   account.accessToken,
    messageType:   "template",
    templateName:  template.name,
    templateLang:  template.language ?? "ar",
    templateVars:  null,
    content:       null,
  });

  // سجّل النتيجة في جدول الرسائل
  await prisma.message.create({
    data: {
      userId,
      contactId,
      content:   `[أتمتة] ${template.name}`,
      type:      MessageType.template,
      direction: MessageDirection.outbound,
      status:    result.ok ? MessageStatus.sent : MessageStatus.failed,
      whatsappId: result.ok ? result.whatsappMsgId : null,
      error:      result.ok ? null : (result.error ?? "فشل الإرسال"),
      sentAt:    result.ok ? new Date() : null,
      // نخزّن ruleId في metadata لو الـ schema بيدعمها، وإلا نتجاهل
    },
  }).catch(() => {}); // لو فشل التسجيل ما يوقفش الباقي

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cron 1: noReplyCron
// يشتغل كل يوم الساعة 9 صباحاً (UTC)
// يجيب كل قواعد NO_REPLY المفعّلة ويبعت قالب للعملاء الصامتين
// ═══════════════════════════════════════════════════════════════════════════════
export const noReplyCron = inngest.createFunction(
  {
    id:      "automation-no-reply-cron",
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

    let totalSent   = 0;
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
          where:  { id: rule.templateId!, userId: rule.userId },
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
            userId:    rule.userId,
            direction: "outbound",
            content:   { contains: `[أتمتة] ${template.name}` },
            sentAt:    { gte: todayStart },
          },
          select: { contactId: true },
        });
        const excludeIds = alreadySentToday.map(m => m.contactId).filter(Boolean) as string[];

        return await prisma.contact.findMany({
          where: {
            userId:        rule.userId,
            deletedAt:     null,
            lastMessageAt: { lte: cutoffDate, not: null },
            id:            excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
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
            userId:    rule.userId,
            contactId: contact.id,
            phone:     contact.phone,
            template:  { id: template.id, name: template.name, language: template.language ?? "ar" },
            account,
            ruleId:    rule.id,
          });
          if (result.ok) sent++;
          else           failed++;

          // delay بسيط بين الرسائل لتجنب rate limit
          await new Promise(r => setTimeout(r, 300));
        }
        return { sent, failed };
      });

      totalSent   += sent;
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
    id:      "automation-time-based-cron",
    retries: 1,
    triggers: [{ cron: "5 * * * *" }], // كل ساعة عند :05
  },
  async ({ step }: { step: any }) => {

    // ─── الوقت الحالي (Cairo = UTC+2) ──────────────────────────────────────
    const nowUtc   = new Date();
    const nowCairo = new Date(nowUtc.getTime() + 2 * 60 * 60 * 1000); // +2 ساعة
    const currentHour = nowCairo.getUTCHours();
    const currentDay  = ["sun","mon","tue","wed","thu","fri","sat"][nowCairo.getUTCDay()];
    const currentMin  = nowCairo.getUTCMinutes();

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

    let totalSent   = 0;
    let totalFailed = 0;
    const matchedRules: string[] = [];

    for (const rule of rules) {
      // ─── parse triggerValue ─────────────────────────────────────────────
      let schedDays: string[] = [];
      let schedHour    = -1;
      let audienceId   = "";
      let maxContacts  = 1000;
      try {
        const parsed = JSON.parse(rule.triggerValue ?? "{}");
        schedDays   = parsed.days        ?? [];
        schedHour   = parseInt(parsed.hour ?? "-1", 10);
        audienceId  = parsed.audienceId  ?? "";
        maxContacts = parseInt(parsed.maxContacts ?? "1000", 10) || 1000;
      } catch { continue; }

      // ─── تحقق من التطابق ────────────────────────────────────────────────
      if (!schedDays.includes(currentDay)) continue;
      if (schedHour !== currentHour)       continue;

      matchedRules.push(rule.id);

      const account = rule.user?.whatsappAccount;
      if (!account || !rule.templateId) continue;

      // ─── جيب القالب ─────────────────────────────────────────────────────
      const template = await step.run(`get-template-tb-${rule.id}`, async () => {
        return await prisma.template.findFirst({
          where:  { id: rule.templateId!, userId: rule.userId },
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
            userId:    rule.userId,
            direction: "outbound",
            content:   { contains: `[أتمتة] ${template.name}` },
            sentAt:    { gte: todayStart },
          },
          select: { contactId: true },
        });
        const excludeIds = alreadySentToday.map(m => m.contactId).filter(Boolean) as string[];

        // لو في audienceId محدد — جيب الكونتاكتس منه فقط
        if (audienceId) {
          const audience = await prisma.audience.findFirst({
            where:  { id: audienceId, userId: rule.userId },
            select: {
              contacts: {
                where:  {
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
            userId:    rule.userId,
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
            userId:    rule.userId,
            contactId: contact.id,
            phone:     contact.phone,
            template:  { id: template.id, name: template.name, language: template.language ?? "ar" },
            account,
            ruleId:    rule.id,
          });
          if (result.ok) sent++;
          else           failed++;
          await new Promise(r => setTimeout(r, 300));
        }
        return { sent, failed };
      });

      totalSent   += sent;
      totalFailed += failed;
    }

    return {
      totalSent, totalFailed,
      matchedRules,
      currentDay, currentHour,
    };
  }
);