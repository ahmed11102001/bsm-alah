import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendEmailViaProvider } from "@/lib/email-marketing/send";

export const emailVipQualified = inngest.createFunction(
  {
    id: "email-vip-qualified",
    retries: 2,
    triggers: [{ event: "email/vip.qualified" }],
  },
  async ({ event, step }) => {
    const { userId, contactId } = event.data;

    const result = await step.run("send-vip-email", async () => {
      // 1. Check if VIP_REPEAT automation is enabled
      const automation = await prisma.emailAutomation.findUnique({
        where: { userId_type: { userId, type: "VIP_REPEAT" } },
      });

      if (!automation || !automation.enabled || !automation.templateId) {
        return { skipped: true, reason: "automation_disabled_or_no_template" };
      }

      // 2. Get contact and check if they have email and haven't received VIP yet
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, email: true, name: true, vipEmailSentAt: true },
      });

      if (!contact || !contact.email) {
        return { skipped: true, reason: "no_email" };
      }

      if (contact.vipEmailSentAt) {
        return { skipped: true, reason: "already_sent_vip_email" };
      }

      // 3. Send email
      const template = await prisma.emailTemplate.findFirst({
        where: { id: automation.templateId, userId },
      });

      if (!template) {
        console.warn(`[EmailVIP] Template not found: ${automation.templateId}`);
        return { skipped: true, reason: "template_not_found" };
      }

      const emailConnection = await prisma.emailConnection.findUnique({
        where: { userId },
      });

      if (!emailConnection) {
        return { skipped: true, reason: "no_email_connection" };
      }

      let html = template.html;
      const nameToUse = contact.name || "عميلنا العزيز";
      html = html.replace(/{{name}}/g, nameToUse);

      await sendEmailViaProvider({
        connection: emailConnection,
        to: contact.email,
        subject: template.subject,
        html,
      });

      // 4. Update contact
      await prisma.contact.update({
        where: { id: contactId },
        data: { vipEmailSentAt: new Date() },
      });

      return { sent: true };
    });

    console.log(`[EmailVIP] Processed for contact ${contactId}: ${result.sent ? "Sent" : `Skipped (${result.reason})`}`);
    return result;
  }
);
