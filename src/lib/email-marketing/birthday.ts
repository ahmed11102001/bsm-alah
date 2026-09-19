// src/lib/email-marketing/birthday.ts
// ─── أتمتة عيد الميلاد (إيميل بس) ───────────────────────────────────────────
// الكور المستخدم من كرون يومي + trigger يدوي. لكل يوزر مفعّل الأتمتة وعنده
// قالب وSMTP شغال (آخر Test ناجح): اللي عيد ميلادهم النهاردة (شهر/يوم بتوقيت
// القاهرة) ومتبعتلهمش السنة دي → إيميل بالقالب ({{name}}/{{email}} بنفس آلية
// sender.ts) + تسجيل في EmailDelivery + تحديث lastBirthdayEmailSentAt.

import prisma from "@/lib/prisma";
import { getEmailConnection } from "./connection";
import { sendEmailViaUserSmtp } from "./sender";
import { emailEligibilityWhere } from "./eligibility";

export interface BirthdayRunSummary {
  users: number;
  sent: number;
  failed: number;
  skippedNoConnection: number;
  skippedNoTemplate: number;
}

/** تاريخ النهاردة بتوقيت القاهرة (الشهر/اليوم لمطابقة أعياد الميلاد) */
export function cairoToday(now: Date = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function isBirthdayToday(birthDate: Date, today: { m: number; d: number }): boolean {
  // birthDate متخزنة منتصف ليل UTC — قارن شهر/يوم UTC (ثابتة ومش بتتأثر بتوقيت السيرفر)
  return birthDate.getUTCMonth() + 1 === today.m && birthDate.getUTCDate() === today.d;
}

export function sentThisYear(lastSentAt: Date | null, year: number): boolean {
  if (!lastSentAt) return false;
  return lastSentAt.getUTCFullYear() === year;
}

export async function runBirthdayAutomations(now: Date = new Date()): Promise<BirthdayRunSummary> {
  const summary: BirthdayRunSummary = {
    users: 0,
    sent: 0,
    failed: 0,
    skippedNoConnection: 0,
    skippedNoTemplate: 0,
  };

  const automations = await prisma.emailAutomation.findMany({
    where: { type: "BIRTHDAY", enabled: true },
    include: { template: { select: { id: true, subject: true, bodyHtml: true, previewText: true } } },
  });

  const today = cairoToday(now);

  for (const automation of automations) {
    if (!automation.templateId || !automation.template) {
      summary.skippedNoTemplate++;
      continue;
    }

    const connection = await getEmailConnection(automation.userId);
    if (!connection || !connection.host || !connection.user || !connection.password || connection.lastTestSuccess !== true) {
      console.log(`[birthday] user ${automation.userId} skipped — no working SMTP connection`);
      summary.skippedNoConnection++;
      continue;
    }

    summary.users++;

    const contacts = await prisma.contact.findMany({
      where: {
        ...emailEligibilityWhere(automation.userId),
        deletedAt: null,
        birthDate: { not: null },
        AND: [{ email: { not: "" } }],
      },
      select: { id: true, email: true, name: true, birthDate: true, lastBirthdayEmailSentAt: true },
    });

    for (const contact of contacts) {
      if (!contact.birthDate || !contact.email) continue;
      if (!isBirthdayToday(contact.birthDate, today)) continue;
      if (sentThisYear(contact.lastBirthdayEmailSentAt, today.y)) continue;

      const delivery = await prisma.emailDelivery.create({
        data: {
          campaignId: null,
          contactId: contact.id,
          contactEmail: contact.email,
          contactName: contact.name || null,
          status: "QUEUED",
        },
      });

      const res = await sendEmailViaUserSmtp(automation.userId, {
        to: contact.email,
        recipientName: contact.name,
        subject: automation.template.subject,
        html: automation.template.bodyHtml,
        previewText: automation.template.previewText,
        contactId: contact.id,
      });

      if (res.success) {
        summary.sent++;
        await prisma.emailDelivery
          .update({ where: { id: delivery.id }, data: { status: "DELIVERED", sentAt: new Date() } })
          .catch(() => {});
        await prisma.contact
          .update({ where: { id: contact.id }, data: { lastBirthdayEmailSentAt: new Date() } })
          .catch(() => {});
      } else {
        summary.failed++;
        await prisma.emailDelivery
          .update({
            where: { id: delivery.id },
            data: { status: "FAILED", errorMessage: res.error || "خطأ في الإرسال", sentAt: new Date() },
          })
          .catch(() => {});
      }
    }
  }

  console.log(
    `[birthday] done users=${summary.users} sent=${summary.sent} failed=${summary.failed} ` +
      `noConn=${summary.skippedNoConnection} noTpl=${summary.skippedNoTemplate}`
  );
  return summary;
}
