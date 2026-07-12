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
