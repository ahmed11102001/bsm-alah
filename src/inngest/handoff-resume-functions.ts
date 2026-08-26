// src/inngest/handoff-resume-functions.ts
// ─── AI Agent Handoff Auto-Resume ────────────────────────────────────────────
//
// عندما الـ AI Agent يحوّل المحادثة لموظف (NEEDS_HUMAN)، يتم جدولة timer.
// بعد انتهاء المدة المحددة (handoffResumeMinutes)، يتم فحص شامل:
// - هل المحادثة ما زالت في NEEDS_HUMAN؟
// - هل الـ handoff ده هو نفس الحالي (حماية من stale timers)؟
// - هل رد موظف فعلياً (رسالة outbound بـ senderType=human بعد handoffAt)؟
// - هل الميزة لسه مفعّلة؟
// لو كل الشروط متحققة → يرجع الـ AI تلقائي (AUTO).

import { inngest } from "./client";
import prisma from "@/lib/prisma";

export const handoffResumeFn = inngest.createFunction(
  {
    id: "ai-agent-handoff-resume",
    retries: 2,
    triggers: [{ event: "ai-agent/handoff-resume-check" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, contactId, handoffAt } = event.data as {
      userId: string;
      contactId: string;
      handoffAt: string; // ISO timestamp — يُستخدم كـ version identifier
    };

    console.log(
      `[AI-HANDOFF-TIMER] Started — contact=${contactId} handoffAt=${handoffAt}`
    );

    // ── Step 1: اقرأ الإعداد الحالي وانتظر المدة المحددة ──────────────────
    const delayMinutes = await step.run("read-delay-setting", async () => {
      const agent = await prisma.aIAgent.findUnique({
        where: { userId },
        select: { handoffResumeMinutes: true },
      });

      // لو الميزة معطّلة (null) أو الـ Agent مش موجود → لا تعمل resume
      if (agent?.handoffResumeMinutes == null || agent.handoffResumeMinutes <= 0) {
        return null;
      }

      return agent.handoffResumeMinutes;
    });

    if (delayMinutes == null) {
      console.log(
        `[AI-HANDOFF-TIMER] Auto resume disabled — keeping NEEDS_HUMAN for contact=${contactId}`
      );
      return { resumed: false, reason: "auto_resume_disabled" };
    }

    console.log(
      `[AI-HANDOFF-TIMER] Waiting ${delayMinutes} minutes before checking human response — contact=${contactId}`
    );

    await step.sleep("wait-for-human-response", `${delayMinutes}m`);

    // ── Step 2: فحص شامل من DB وتنفيذ Resume إذا كان مناسبًا ──────────────
    const result = await step.run("verify-and-resume", async () => {
      // 1. اقرأ حالة الـ contact الحالية
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: {
          aiStatus: true,
          handoffAt: true,
        },
      });

      if (!contact) {
        console.log(
          `[AI-HANDOFF-TIMER] Contact not found — contact=${contactId}`
        );
        return { resumed: false, reason: "contact_not_found" };
      }

      // 2. هل المحادثة ما زالت في NEEDS_HUMAN؟
      if (contact.aiStatus !== "NEEDS_HUMAN") {
        console.log(
          `[AI-HANDOFF-TIMER] Status already changed to ${contact.aiStatus} — skipping resume for contact=${contactId}`
        );
        return { resumed: false, reason: `status_already_${contact.aiStatus}` };
      }

      // 3. هل ده نفس الـ handoff؟ (حماية من stale timers)
      const originalHandoffAt = new Date(handoffAt);
      if (
        !contact.handoffAt ||
        contact.handoffAt.getTime() !== originalHandoffAt.getTime()
      ) {
        console.log(
          `[AI-HANDOFF-TIMER] Handoff timestamp mismatch — stale timer detected for contact=${contactId}`
        );
        return { resumed: false, reason: "stale_timer" };
      }

      // 4. هل رد موظف فعلياً؟ (رسالة outbound بـ senderType=human بعد handoffAt)
      const humanReply = await prisma.message.findFirst({
        where: {
          contactId,
          userId,
          direction: "outbound",
          senderType: "human",
          createdAt: { gt: originalHandoffAt },
        },
        select: { id: true, createdAt: true },
      });

      if (humanReply) {
        console.log(
          `[AI-HANDOFF-TIMER] Human replied at ${humanReply.createdAt.toISOString()} — keeping conversation with human for contact=${contactId}`
        );
        return { resumed: false, reason: "human_replied" };
      }

      // 5. أعد قراءة الإعداد — ربما المستخدم عطّله أثناء الانتظار
      const agent = await prisma.aIAgent.findUnique({
        where: { userId },
        select: { handoffResumeMinutes: true },
      });

      if (agent?.handoffResumeMinutes == null || agent.handoffResumeMinutes <= 0) {
        console.log(
          `[AI-HANDOFF-TIMER] Auto resume disabled during wait — keeping NEEDS_HUMAN for contact=${contactId}`
        );
        return { resumed: false, reason: "auto_resume_disabled_during_wait" };
      }

      // 6. Conditional update — حماية من race condition
      //    updateMany مع شروط دقيقة: لن يتم التحديث إلا إذا تطابقت الشروط
      const updateResult = await prisma.contact.updateMany({
        where: {
          id: contactId,
          aiStatus: "NEEDS_HUMAN",
          handoffAt: originalHandoffAt,
        },
        data: {
          aiStatus: "AUTO",
          handoffReason: null,
          handoffAt: null,
        },
      });

      if (updateResult.count === 0) {
        console.log(
          `[AI-HANDOFF-TIMER] Conditional update matched 0 rows — race condition or state changed for contact=${contactId}`
        );
        return { resumed: false, reason: "conditional_update_failed" };
      }

      console.log(
        `[AI-HANDOFF-TIMER] No human response — resuming AI for contact=${contactId}`
      );
      return { resumed: true };
    });

    return result;
  }
);
