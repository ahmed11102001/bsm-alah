// src/inngest/email-birthday-functions.ts
// ─── أتمتة عيد الميلاد: كرون يومي + trigger يدوي منفصل ──────────────────────
// الكرون ثابت (مرة واحدة باليوم ~7 صباحًا القاهرة) — للاختبار اليدوي ابعت
// event باسم email/birthday.trigger من Inngest dashboard بدل تغيير الجدولة.

import { inngest } from "./client";
import { runBirthdayAutomations } from "@/lib/email-marketing/birthday";

export const birthdayDailyCron = inngest.createFunction(
  {
    id: "email-birthday-daily",
    name: "Birthday Emails (daily, Cairo morning)",
    // 4:00 UTC ≈ 6-7 صباحًا بتوقيت القاهرة (شتاء/صيف)
    triggers: [{ cron: "0 4 * * *" }],
  },
  async ({ step }) => {
    const summary = await step.run("send-birthday-emails", () => runBirthdayAutomations());
    return summary;
  }
);

export const birthdayManualTrigger = inngest.createFunction(
  {
    id: "email-birthday-manual",
    name: "Birthday Emails (manual trigger)",
    triggers: [{ event: "email/birthday.trigger" }],
  },
  async ({ step }) => {
    const summary = await step.run("send-birthday-emails", () => runBirthdayAutomations());
    return summary;
  }
);
