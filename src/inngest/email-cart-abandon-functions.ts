import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { sendEmailViaProvider } from "@/lib/email-marketing/send";

export const emailCartAbandonedSteps = inngest.createFunction(
  {
    id: "email-cart-abandoned-steps",
    retries: 2,
    triggers: [{ event: "shopify/cart.abandoned" }],
  },
  async ({ event, step }) => {
    const { userId, customerPhone, customerEmail, checkoutToken, customerName } = event.data;

    // 1. Check if CART_ABANDONED automation is enabled
    const automation = await step.run("get-cart-automation", async () => {
      return prisma.emailAutomation.findUnique({
        where: { userId_type: { userId, type: "CART_ABANDONED" } },
      });
    });

    if (!automation || !automation.enabled) {
      return { skipped: true, reason: "automation_disabled" };
    }

    const settings = automation.settings as any;
    if (!settings?.steps || !Array.isArray(settings.steps) || settings.steps.length === 0) {
      return { skipped: true, reason: "no_steps_configured" };
    }

    // 2. Find Contact to ensure they have an email if it wasn't in the event
    const contact = await step.run("get-contact-email", async () => {
      if (customerEmail) {
        return prisma.contact.findFirst({
          where: { userId, email: customerEmail },
          select: { id: true, email: true, name: true }
        }) || prisma.contact.findFirst({
          where: { userId, phone: customerPhone },
          select: { id: true, email: true, name: true }
        });
      }
      return prisma.contact.findFirst({
        where: { userId, phone: customerPhone },
        select: { id: true, email: true, name: true },
      });
    });

    const targetEmail = contact?.email || customerEmail;
    if (!targetEmail) {
      return { skipped: true, reason: "no_email_address" };
    }

    const cartAbandonedTime = new Date();

    // 3. Process Steps sequentially
    let previousDelay = 0;
    
    for (let i = 0; i < settings.steps.length; i++) {
      const currentStep = settings.steps[i];
      
      // Calculate sleep time relative to previous step to maintain absolute delay from abandonment
      const sleepHours = currentStep.delayHours - previousDelay;
      if (sleepHours > 0) {
        await step.sleep(`wait-for-step-${i + 1}`, `${sleepHours}h`);
      }
      previousDelay = currentStep.delayHours;

      // Check if user completed the order since abandonment
      const orderCompleted = await step.run(`check-order-${i + 1}`, async () => {
        if (!contact?.id) return false;
        const recentOrder = await prisma.storeOrder.findFirst({
          where: {
            userId,
            contactId: contact.id,
            orderedAt: { gte: cartAbandonedTime },
          },
        });
        return !!recentOrder;
      });

      if (orderCompleted) {
        return { stopped: true, reason: "order_completed" };
      }

      // Send the email for this step
      await step.run(`send-email-step-${i + 1}`, async () => {
        const template = await prisma.emailTemplate.findFirst({
          where: { id: currentStep.templateId, userId },
        });

        if (!template) {
          throw new Error(`Template not found: ${currentStep.templateId}`);
        }

        const emailConnection = await prisma.emailConnection.findUnique({
          where: { userId },
        });

        if (!emailConnection) {
          throw new Error(`No email connection for user ${userId}`);
        }

        let html = template.bodyHtml;
        const nameToUse = contact?.name || customerName || "عميلنا العزيز";
        html = html.replace(/{{name}}/g, nameToUse);

        const res = await sendEmailViaProvider({
          connection: emailConnection,
          to: targetEmail,
          subject: template.subject,
          html,
        });
        if (!res.success) {
          throw new Error(res.error || "Email send failed");
        }

        return { sent: true, step: i + 1 };
      });
    }

    return { success: true, stepsCompleted: settings.steps.length };
  }
);
