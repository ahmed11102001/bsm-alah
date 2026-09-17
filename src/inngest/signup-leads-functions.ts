// src/inngest/signup-leads-functions.ts
// ─── تذكير التسجيلات الناقصة بعد 24 ساعة ────────────────────────────────────
// كل ساعة: اللي عدّى عليهم 24 ساعة من اختيار الإيميل ولسه PENDING بيتبعت لهم
// إيميل (بلغتهم) فيه لينك يرجعهم مكان ما وقفوا (خطوة الرقم).

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { getEmailBaseUrl, sendSignupResumeEmail } from "@/lib/email";
import {
  REMINDER_AFTER_HOURS,
  REMINDER_MAX_ATTEMPTS,
  SIGNUP_LEAD_STATUS,
  issueResumeToken,
  markSignupLeadConverted,
  normalizeLeadLocale,
} from "@/lib/signup-leads";

const BATCH_SIZE = 200;

export const signupLeadsReminder = inngest.createFunction(
  {
    id: "signup-leads-reminder",
    name: "Signup Leads 24h Reminder",
    triggers: [{ cron: "20 * * * *" }], // كل ساعة في الدقيقة 20
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - REMINDER_AFTER_HOURS * 60 * 60 * 1000);

    const due = await step.run("fetch-due-signup-leads", () =>
      prisma.signupLead.findMany({
        where: {
          status: SIGNUP_LEAD_STATUS.PENDING,
          createdAt: { lte: cutoff },
          reminderAttempts: { lt: REMINDER_MAX_ATTEMPTS },
        },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
        select: { id: true },
      })
    );

    let sent = 0;
    let failed = 0;
    let converted = 0;

    for (const { id } of due) {
      const outcome = await step.run(`remind-signup-lead-${id}`, async (): Promise<
        "sent" | "failed" | "converted" | "skipped"
      > => {
        const lead = await prisma.signupLead.findUnique({ where: { id } });
        if (!lead || lead.status !== SIGNUP_LEAD_STATUS.PENDING) return "skipped";

        // كمّل في النص من غير اللينك؟ اقفل الليد ومتزعجوش
        const accountExists =
          lead.source === "PORTAL"
            ? await prisma.developerUser.findUnique({
                where: { email: lead.email },
                select: { id: true },
              })
            : await prisma.user.findUnique({
                where: { email: lead.email },
                select: { id: true },
              });
        if (accountExists) {
          await markSignupLeadConverted(lead.email);
          return "converted";
        }

        const rawToken = await issueResumeToken(lead.id);
        if (!rawToken) return "failed";

        const locale = normalizeLeadLocale(lead.locale);
        const resumeUrl = `${getEmailBaseUrl()}/api/auth/signup/resume?token=${rawToken}`;
        try {
          await sendSignupResumeEmail({
            to: lead.email,
            name: lead.name,
            resumeUrl,
            source: lead.source === "PORTAL" ? "PORTAL" : "DASHBOARD",
            locale,
          });
        } catch (err) {
          console.error(
            "[signup-leads-reminder] email failed",
            lead.email,
            err instanceof Error ? err.message : "unknown"
          );
          await prisma.signupLead
            .update({
              where: { id: lead.id },
              data: { reminderAttempts: { increment: 1 } },
            })
            .catch(() => {});
          return "failed";
        }

        await prisma.signupLead
          .update({
            where: { id: lead.id },
            data: {
              status: SIGNUP_LEAD_STATUS.REMINDED,
              reminderSentAt: new Date(),
              reminderAttempts: { increment: 1 },
            },
          })
          .catch(() => {});
        return "sent";
      });

      if (outcome === "sent") sent++;
      else if (outcome === "failed") failed++;
      else if (outcome === "converted") converted++;
    }

    console.log(
      `[SIGNUP-LEADS-REMINDER] due=${due.length} sent=${sent} failed=${failed} converted=${converted}`
    );
    return { due: due.length, sent, failed, converted };
  }
);
