import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendEmailViaProvider } from "@/lib/email-marketing/send";

export const emailWinbackDailyCron = inngest.createFunction(
  {
    id: "email-winback-daily-cron",
    retries: 2,
  },
  { cron: "0 9 * * *" }, // Runs daily at 9:00 AM UTC
  async ({ step }) => {
    // 1. Get all enabled WIN_BACK automations
    const automations = await step.run("get-enabled-winback-automations", async () => {
      return prisma.emailAutomation.findMany({
        where: { type: "WIN_BACK", enabled: true },
        include: { template: true, user: { include: { emailConnection: true } } },
      });
    });

    if (!automations || automations.length === 0) {
      return { skipped: true, reason: "no_automations_enabled" };
    }

    let totalEmailsSent = 0;

    // 2. Process each automation
    for (const automation of automations) {
      if (!automation.template || !automation.user.emailConnection) continue;

      const settings = automation.settings as any;
      const daysInactive = settings?.daysInactive || 60;
      
      // Calculate the exact date for "daysInactive" days ago
      const targetDateStart = new Date();
      targetDateStart.setUTCDate(targetDateStart.getUTCDate() - daysInactive);
      targetDateStart.setUTCHours(0, 0, 0, 0);

      const targetDateEnd = new Date(targetDateStart);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      // Find contacts whose last StoreOrder was on targetDate 
      // AND who haven't received a winback email in the last 'daysInactive' days
      const thresholdDateForPreviousEmails = new Date();
      thresholdDateForPreviousEmails.setUTCDate(thresholdDateForPreviousEmails.getUTCDate() - daysInactive);

      const contactsToEmail = await step.run(`get-contacts-for-user-${automation.userId}`, async () => {
        // We find the contacts that meet the criteria
        // Prisma doesn't have a direct "last relation max date" in simple where easily, 
        // so we find all contacts, but it's more efficient to find orders first.
        // But contact could have multiple orders.
        // We'll query orders within the target window, group by contactId, then verify they are the latest.
        
        // Simpler approach: find contacts whose latest order is exactly in the targetDate window.
        // Since we can't easily do MAX() in a simple findMany relation without complex queries,
        // we'll fetch contacts who have an order in the window, and check their latest order.
        
        const possibleContacts = await prisma.contact.findMany({
          where: {
            userId: automation.userId,
            email: { not: null },
            storeOrders: {
              some: {
                orderedAt: {
                  gte: targetDateStart,
                  lte: targetDateEnd,
                }
              }
            },
            OR: [
              { winbackEmailSentAt: null },
              { winbackEmailSentAt: { lt: thresholdDateForPreviousEmails } }
            ]
          },
          select: {
            id: true,
            email: true,
            name: true,
            storeOrders: {
              orderBy: { orderedAt: 'desc' },
              take: 1,
              select: { orderedAt: true }
            }
          }
        });

        // Filter locally to ensure the latest order is indeed the one in the window
        return possibleContacts.filter(c => {
          if (c.storeOrders.length === 0) return false;
          const latestOrderDate = c.storeOrders[0].orderedAt;
          return latestOrderDate >= targetDateStart && latestOrderDate <= targetDateEnd;
        });
      });

      if (contactsToEmail.length === 0) continue;

      // Send emails
      const sentCount = await step.run(`send-winback-emails-user-${automation.userId}`, async () => {
        let sent = 0;
        for (const contact of contactsToEmail) {
          try {
            let html = automation.template!.html;
            const nameToUse = contact.name || "عميلنا العزيز";
            html = html.replace(/{{name}}/g, nameToUse);

            await sendEmailViaProvider({
              connection: automation.user.emailConnection!,
              to: contact.email!,
              subject: automation.template!.subject,
              html,
            });

            await prisma.contact.update({
              where: { id: contact.id },
              data: { winbackEmailSentAt: new Date() }
            });

            sent++;
          } catch (e) {
            console.error(`[Winback] Failed to send email to contact ${contact.id}`, e);
          }
        }
        return sent;
      });

      totalEmailsSent += sentCount;
    }

    console.log(`[Winback] Daily cron finished. Emails sent: ${totalEmailsSent}`);
    return { success: true, emailsSent: totalEmailsSent };
  }
);
