// src/inngest/ai-reply-debounce-functions.ts
// ─── AI Reply Debounce — تجميع الرسائل المتتالية قبل رد الـ AI Agent ──────────
//
// الفكرة: لما العميل يبعت رسايل متتالية وسريعة، يتم تأجيل استدعاء الـ AI لمدة 8 ثواني.
// لو جت رسالة جديدة في نفس الفترة، يتم إلغاء الـ Function السابقة عبر Inngest cancelOn
// وجدولة Function جديدة. وعند انتهاء فترة الـ sleep بدون رسايل جديدة، يتم تجميع كل
// الرسايل وتوليد رد واحد شامل.

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { MessageDirection } from "@/types/enums";
import { runAIAgentReply } from "@/lib/ai-agent-runner";

export const AI_REPLY_DEBOUNCE_DELAY = "8s";

export const aiReplyDebounceFn = inngest.createFunction(
  {
    id: "agent-conversation-ai-reply",
    retries: 2,
    // لو جت رسالة جديدة من نفس العميل (agent-conversation.ai-reply-cancel)
    // قبل ما الـ function تتنفذ، يتم إلغاؤها تلقائياً بالـ match على contactId
    cancelOn: [
      { event: "agent-conversation.ai-reply-cancel", match: "data.contactId" },
    ],
    triggers: [{ event: "agent-conversation.ai-reply-check" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { contactId, userId, from, triggerMessageId } = event.data as {
      contactId: string;
      userId: string;
      from: string;
      triggerMessageId?: string;
      triggerMessageAt?: string;
    };

    // 1. انتظار تجميع أي رسائل متتالية إضافية
    await step.sleep("wait-for-more-messages", AI_REPLY_DEBOUNCE_DELAY);

    // 2. فحص دفاعي إضافي: هل ما زالت هذه أحدث رسالة واردة من العميل؟
    const shouldReply = await step.run("verify-still-latest", async () => {
      if (!triggerMessageId) return true;
      const lastInbound = await prisma.message.findFirst({
        where: { contactId, direction: MessageDirection.inbound },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      return lastInbound?.id === triggerMessageId;
    });

    if (!shouldReply) {
      console.log(
        `[AI-DEBOUNCE] Superseded for contact ${contactId} — newer message exists`
      );
      return { sent: false, reason: "superseded" };
    }

    // 3. تنفيذ توليد وإرسال رد الـ AI
    return await step.run("generate-and-send-ai-reply", async () => {
      return await runAIAgentReply({
        contactId,
        userId,
        from,
      });
    });
  }
);
