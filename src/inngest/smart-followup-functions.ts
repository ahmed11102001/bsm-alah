// src/inngest/smart-followup-functions.ts
// ─── دوال Inngest للمتابعة الذكية ────────────────────────────────────────────

import { inngest } from "./client";

// ─── Shipping Follow-Up Schedule ──────────────────────────────────────────────

export const scheduleShippingFollowUpFn = inngest.createFunction(
  {
    id: "followup-shipping-schedule",
    retries: 3,
    triggers: [{ event: "followup/shipping.schedule" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { storeOrderId, delayDays } = event.data;
    let remaining = delayDays;

    if (remaining > 0) await step.sleep("wait-trigger-delay", `${remaining}d`);

    // ── إعادة تحقق من التوقيت الحالي ──
    for (let i = 0; i < 5; i++) {
      const check = await step.run(`check-reschedule-${i}`, async () => {
        const { checkShippingRescheduleNeeded } = await import("@/lib/smart-followup");
        return checkShippingRescheduleNeeded(storeOrderId, delayDays);
      });
      if (!check.needsReschedule) break;
      await step.sleep(`extra-wait-${i}`, `${check.extraSleepSeconds}s`);
    }

    return step.run("send-shipping-followup", async () => {
      const { sendShippingFollowUpNow } = await import("@/lib/smart-followup");
      return sendShippingFollowUpNow(storeOrderId, delayDays);
    });
  }
);

// ─── Cart Follow-Up Schedule ──────────────────────────────────────────────────

export const scheduleCartFollowUpFn = inngest.createFunction(
  {
    id: "followup-cart-schedule",
    retries: 3,
    triggers: [{ event: "followup/cart.schedule" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { abandonedCartId, delayDays } = event.data;

    if (delayDays > 0) await step.sleep("wait-trigger-delay", `${delayDays}d`);

    for (let i = 0; i < 5; i++) {
      const check = await step.run(`check-reschedule-${i}`, async () => {
        const { checkCartRescheduleNeeded } = await import("@/lib/smart-followup");
        return checkCartRescheduleNeeded(abandonedCartId, delayDays);
      });
      if (!check.needsReschedule) break;
      await step.sleep(`extra-wait-${i}`, `${check.extraSleepSeconds}s`);
    }

    return step.run("send-cart-followup", async () => {
      const { sendCartFollowUpNow } = await import("@/lib/smart-followup");
      return sendCartFollowUpNow(abandonedCartId, delayDays);
    });
  }
);

// ─── Follow-Up Action (for replyDelayMinutes > 0) ───────────────────────────

export const sendFollowUpActionFn = inngest.createFunction(
  {
    id: "followup-action-send",
    retries: 2,
    triggers: [{ event: "followup/action.send" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { kind, recordId, action, replyDelaySeconds } = event.data;
    if (replyDelaySeconds > 0) await step.sleep("wait-reply-delay", `${replyDelaySeconds}s`);
    return step.run("execute-action", async () => {
      const { executeFollowUpAction } = await import("@/lib/smart-followup");
      return executeFollowUpAction(kind, recordId, action);
    });
  }
);

// ─── Campaign Follow-Up Schedule ──────────────────────────────────────────────

export const scheduleCampaignFollowUpFn = inngest.createFunction(
  {
    id: "followup-campaign-schedule",
    retries: 3,
    triggers: [{ event: "campaign_followup/schedule" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, userId, delayDays, templateId } = event.data;
    const delayInSeconds = Math.round(delayDays * 24 * 60 * 60);

    if (delayInSeconds > 0) {
      await step.sleep("wait-trigger-delay", `${delayInSeconds}s`);
    }

    return step.run("send-campaign-followup", async () => {
      const prisma = (await import("@/lib/prisma")).default;
      
      // Get all recipients who received the campaign
      const messages = await prisma.message.findMany({
        where: { campaignId, status: "sent" },
        select: { id: true, contactId: true, contact: { select: { phone: true } } }
      });

      if (!messages.length) return { sent: 0 };

      let count = 0;
      for (const msg of messages) {
        if (!msg.contact) continue;

        const record = await prisma.campaignFollowUpRecord.create({
          data: {
            userId,
            campaignId,
            contactId: msg.contactId!,
            messageId: msg.id,
            customerPhone: msg.contact.phone,
            followUpStage: "SENT",
            followUpStageExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours to reply
          }
        });

        // Queue message sending for this recipient
        await inngest.send({
          name: "campaign_followup/send_msg",
          data: { recordId: record.id, templateId, userId }
        });

        count++;
      }
      return { scheduledCount: count };
    });
  }
);

// ─── Campaign Follow-Up Send Msg ──────────────────────────────────────────────

export const sendCampaignFollowUpMsgFn = inngest.createFunction(
  {
    id: "followup-campaign-send-msg",
    retries: 3,
    triggers: [{ event: "campaign_followup/send_msg" }],
    concurrency: { limit: 10, key: "event.data.userId" }, // protect limits
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { recordId, templateId, userId } = event.data;

    const record = await step.run("get-record", async () => {
      const prisma = (await import("@/lib/prisma")).default;
      return prisma.campaignFollowUpRecord.findUnique({
        where: { id: recordId },
        include: { user: { include: { whatsappAccount: true } } }
      });
    });

    if (!record || !record.user.whatsappAccount) return { error: "no_record_or_account" };

    const template = await step.run("get-template", async () => {
      const prisma = (await import("@/lib/prisma")).default;
      return templateId ? prisma.template.findUnique({ where: { id: templateId } }) : null;
    });

    if (!template || template.status?.toLowerCase() !== "approved") {
      return { error: "template_not_approved" };
    }

    const contact = await step.run("get-contact", async () => {
      const prisma = (await import("@/lib/prisma")).default;
      return prisma.contact.findUnique({
        where: { id: record.contactId },
        select: { name: true }
      });
    });

    const result = await step.run("send-msg", async () => {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp-api");
      const { decryptToken } = await import("@/lib/crypto");
      
      return sendWhatsAppMessage({
        toPhone: record.customerPhone,
        phoneNumberId: record.user.whatsappAccount!.phoneNumberId,
        accessToken: decryptToken(record.user.whatsappAccount!.accessToken),
        messageType: "template",
        templateName: template.name,
        templateLang: template.language || "ar",
        templateVars: { body: [contact?.name || "عميلنا العزيز"] },
        content: `[Campaign Follow-Up] ${template.name}`,
      });
    });

    await step.run("update-record", async () => {
      const prisma = (await import("@/lib/prisma")).default;
      if (result.ok) {
        await prisma.campaignFollowUpRecord.update({
          where: { id: recordId },
          data: {
            followUpSentAt: new Date(),
            followUpMessageId: result.whatsappMsgId,
          }
        });
      } else if (result.isRateLimit) {
        throw new Error(`Rate limit sending campaign follow-up: ${result.error}`);
      } else {
        await prisma.campaignFollowUpRecord.delete({ where: { id: recordId } }).catch(() => {});
        await prisma.campaignFollowUpSetting.updateMany({
          where: { userId, campaignId: record.campaignId },
          data: { failedCount: { increment: 1 } },
        }).catch(() => {});
        const { notifySmartFollowUpAlert } = await import("@/lib/notifications");
        await notifySmartFollowUpAlert(userId, "campaign_send_failed",
          { customerPhone: record.customerPhone, error: result.error }).catch(() => {});
      }
    });

    return { ok: result.ok };
  }
);

// ─── Campaign Follow-Up Action ────────────────────────────────────────────────

export const campaignFollowUpActionFn = inngest.createFunction(
  {
    id: "followup-campaign-action",
    retries: 2,
    triggers: [{ event: "campaign_followup/action.send" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { recordId, action, replyDelaySeconds } = event.data;
    if (replyDelaySeconds > 0) await step.sleep("wait-reply-delay", `${replyDelaySeconds}s`);
    
    return step.run("execute-action", async () => {
      const { executeCampaignFollowUpAction } = await import("@/lib/campaign-followup");
      return executeCampaignFollowUpAction(recordId, action);
    });
  }
);
