// src/inngest/conversation-nudge-functions.ts
// ─── Conversation Nudge — متابعة سكوت العميل داخل محادثة الـ AI Agent ────────
//
// الفكرة: لو الـ AI رد على العميل وكان الرد لسه بيستنى تفاعل (expectsReply
// = true، اتحدد من الـ AI نفسه وقت توليد الرد)، وسكت العميل 1-3 دقايق من
// غير رد، نبعتله متابعة قصيرة نفس السياق. لو المحادثة اتقفلت طبيعياً
// (شراء تم، استفسار اتحل) الـ AI بيرجع expectsReply=false ومفيش أي جدولة.
//
// ده منفصل تماماً عن نظام SmartFollowUp (order_confirm / shipping /
// cart_abandon) — ده مربوط بحالة المحادثة نفسها مش بحدث في الداتابيز.

import { inngest } from "./client";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { MessageDirection, MessageStatus, MessageType, MessageSenderType } from "@/types/enums";

const NUDGE_DELAY = "2m";           // ابدأ بدقيقتين — عدّلها حسب الـ latency الفعلي للـ queue
const MAX_NUDGES_PER_THREAD = 1;    // مرة واحدة بس لكل فترة سكوت — لا تكرار
const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: يولّد نص الـ nudge عبر نفس الـ AI Agent، بس بتعليمة "نُدج" إضافية
// بدل تعليمة "رد على سؤال". بيستخدم آخر كام رسالة بس (مش المحادثة كاملة)
// عشان النص يفضل قصير ومحدد.
// ─────────────────────────────────────────────────────────────────────────────
async function generateNudgeMessage(
  contactId: string,
  userId: string,
): Promise<{ ok: boolean; text?: string; tokensUsed?: number }> {
  const agent = await prisma.aIAgent.findUnique({
    where: { userId },
    select: {
      isEnabled: true, provider: true,
      brandName: true, businessDesc: true, tone: true,
      systemPrompt: true, languageMode: true,
    },
  });

  if (!agent?.isEnabled) return { ok: false };

  const recentMsgs = await prisma.message.findMany({
    where: { contactId, type: MessageType.text },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { content: true, direction: true },
  });

  if (!recentMsgs.length) return { ok: false };

  const aiMessages: ConversationMessage[] = recentMsgs
    .reverse()
    .filter((m) => m.content)
    .map((m) => ({
      role: m.direction === MessageDirection.inbound ? ("user" as const) : ("assistant" as const),
      content: m.content!,
    }));

  const nudgeInstruction =
    "[وضع المتابعة] العميل سكت من غير رد بعد آخر رسالة منك. اكتب رسالة متابعة " +
    "قصيرة وودودة (سطر أو سطرين بحد أقصى) تسأله بأدب لو محتاج مساعدة إضافية " +
    "في نفس الموضوع اللي كان بيتكلم فيه، من غير ما تكرر نفس المعلومات اللي " +
    "قلتها قبل كده ومن غير ما تخترع سؤال جديد. لو مش متأكد، خلي expectsReply = false.";

  const result = await getAIReply(
    aiMessages,
    {
      brandName: agent.brandName,
      businessDesc: agent.businessDesc,
      tone: agent.tone,
      languageMode: agent.languageMode,
      systemPrompt: [agent.systemPrompt, nudgeInstruction].filter(Boolean).join("\n\n"),
    },
    agent.provider as "gemini" | "openai",
  );

  if (!result.ok || !result.reply?.trim()) return { ok: false };
  return { ok: true, text: result.reply.trim(), tokensUsed: result.tokensUsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// الـ Function الرئيسية
// ─────────────────────────────────────────────────────────────────────────────
export const conversationNudgeFn = inngest.createFunction(
  {
    id: "agent-conversation-nudge",
    retries: 2,
    // لو جت رسالة جديدة من نفس العميل (agent-conversation.nudge-cancel)
    // قبل ما الـ function تتنفذ، الغيها تلقائي — العميل رد خلاص.
    cancelOn: [
      { event: "agent-conversation.nudge-cancel", match: "data.contactId" },
    ],
    triggers: [{ event: "agent-conversation.nudge-check" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { contactId, userId, triggerMessageAt } = event.data as {
      contactId: string;
      userId: string;
      triggerMessageAt: string;
    };

    await step.sleep("wait-before-nudge", NUDGE_DELAY);

    // ── تحقق: هل لسه العميل ساكت، وهل ده لسه أحدث رد AI، وهل تحت الـ cap؟ ──
    const shouldSend = await step.run("verify-still-silent", async () => {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { lastAiRepliedAt: true, nudgeCountInThread: true, aiStatus: true },
      });

      if (!contact) return false;

      // لو حصل رد AI تاني بعد كده (lastAiRepliedAt اتغيّر)، يبقى ده nudge
      // قديم على رد اتجاوز بالفعل — تجاهله. الرد الجديد هيبقى عنده event خاص بيه.
      if (contact.lastAiRepliedAt?.toISOString() !== triggerMessageAt) return false;

      // Cap: لو خلصنا العدد المسموح للـ nudges في الجلسة دي، متبعتش تاني
      if (contact.nudgeCountInThread >= MAX_NUDGES_PER_THREAD) return false;

      // لو حد حوّل المحادثة لإنسان بالفعل، سيبها للإنسان
      if (contact.aiStatus && contact.aiStatus !== "AUTO") return false;

      return true;
    });

    if (!shouldSend) return { sent: false, reason: "not_eligible" };

    // ── احترم نافذة الـ 24 ساعة بتاعة واتساب (free-form text) ──────────────
    const withinWindow = await step.run("check-24h-window", async () => {
      const lastInbound = await prisma.message.findFirst({
        where: { contactId, direction: MessageDirection.inbound },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (!lastInbound) return false;
      return Date.now() - lastInbound.createdAt.getTime() < WHATSAPP_WINDOW_MS;
    });

    if (!withinWindow) {
      // بره النافذة — نص حر ممنوع من ميتا. قرار منتج: إما تتجاهل، أو تستخدم
      // قالب متابعة معتمد مسبقاً (خارج نطاق النسخة الأولى دي).
      return { sent: false, reason: "outside_24h_window" };
    }

    // ── ولّد النص وابعته ─────────────────────────────────────────────────
    return step.run("generate-and-send-nudge", async () => {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: {
          phone: true,
          user: { select: { whatsappAccount: { select: { accessToken: true, phoneNumberId: true } } } },
        },
      });

      const account = contact?.user?.whatsappAccount;
      if (!contact || !account) return { sent: false, reason: "no_whatsapp_account" };

      const nudge = await generateNudgeMessage(contactId, userId);
      if (!nudge.ok || !nudge.text) return { sent: false, reason: "nudge_generation_failed" };

      const result = await sendWhatsAppMessage({
        userId,
        toPhone: contact.phone,
        phoneNumberId: account.phoneNumberId,
        accessToken: decryptToken(account.accessToken),
        messageType: "text",
        templateName: null,
        templateLang: "ar",
        templateVars: null,
        content: nudge.text,
      });

      if (!result.ok) {
        console.error(`[NUDGE] Send failed for contact ${contactId}:`, result.error);
        return { sent: false, reason: result.error };
      }

      await prisma.$transaction([
        prisma.message.create({
          data: {
            userId,
            contactId,
            content: nudge.text,
            type: MessageType.text,
            direction: MessageDirection.outbound,
            status: MessageStatus.sent,
            senderType: MessageSenderType.ai,
            whatsappId: result.whatsappMsgId,
            sentAt: new Date(),
          },
        }),
        prisma.contact.update({
          where: { id: contactId },
          data: { nudgeCountInThread: { increment: 1 } },
        }),
      ]);

      console.log(`[NUDGE] ✓ Sent conversation nudge to contact ${contactId}`);
      return { sent: true };
    });
  }
);
