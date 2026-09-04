// src/lib/ai-agent-runner.ts
// ─── AI Agent Runner — تنفيذ توليد وإرسال رد الـ AI Agent بعد الـ Debounce ───

import prisma from "@/lib/prisma";
import { decryptToken, isEncrypted } from "@/lib/crypto";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { checkAITokensLimit, incrementAITokens } from "@/lib/plan-guard";
import { generateVoiceReply, uploadAudioToCloudinary } from "@/lib/elevenlabs";
import {
  notifyAiHandoffNeeded,
  notifyAutomationFailed,
} from "@/lib/notifications";
import { inngest } from "@/inngest/client";
import {
  MessageDirection,
  MessageStatus,
  MessageType,
  MessageSenderType,
} from "@/types/enums";

export interface RunAIAgentReplyParams {
  contactId: string;
  userId: string;
  from: string;
}

export interface RunAIAgentReplyResult {
  sent: boolean;
  reason?: string;
  whatsappMsgId?: string;
}

/**
 * دالة مركزية لتوليد وإرسال رد الـ AI Agent.
 * تُستدعى من Inngest debounce function بعد اكتمال فترة انتظار تجميع الرسائل (Debounce).
 */
export async function runAIAgentReply(
  params: RunAIAgentReplyParams
): Promise<RunAIAgentReplyResult> {
  const { contactId, userId, from } = params;

  // 1. فحص حصة الـ AI Tokens (Plan Guard)
  const aiPlanGuard = await checkAITokensLimit(userId);
  if (!aiPlanGuard.allowed) {
    console.log(`[AI-AGENT] Blocked — token limit reached for ${userId}`);
    return { sent: false, reason: "token_limit_reached" };
  }

  // 2. جلب جهة الاتصال وبيانات حساب الواتساب
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      phone: true,
      name: true,
      textAiEnabled: true,
      voiceOptOut: true,
      aiStatus: true,
      user: {
        select: {
          whatsappAccount: {
            select: {
              accessToken: true,
              phoneNumberId: true,
            },
          },
        },
      },
    },
  });

  const account = contact?.user?.whatsappAccount;
  if (!contact || !account) {
    console.log(`[AI-AGENT] No contact or WhatsApp account found for ${contactId}`);
    return { sent: false, reason: "no_whatsapp_account" };
  }

  if (contact.aiStatus && contact.aiStatus !== "AUTO") {
    console.log(
      `[AI-AGENT] Paused — conversation needs human (status: ${contact.aiStatus})`
    );
    return { sent: false, reason: `needs_human_${contact.aiStatus}` };
  }

  // 4. جلب إعدادات الـ AI Agent
  const agent = await prisma.aIAgent.findUnique({
    where: { userId },
    select: {
      isEnabled: true,
      provider: true,
      brandName: true,
      businessDesc: true,
      productsInfo: true,
      pricingInfo: true,
      workingHours: true,
      tone: true,
      systemPrompt: true,
      pauseMinutes: true,
      handoffResumeMinutes: true,
      languageMode: true,
      websiteUrl: true,
      websiteButtonText: true,
      textRepliesEnabled: true,
      elevenLabsEnabled: true,
      elevenLabsApiKey: true,
      elevenLabsAgentId: true,
      voiceRepliesEnabled: true,
      elevenLabsVoiceId: true,
      elevenLabsModelId: true,
    },
  });

  if (!agent?.isEnabled) {
    console.log(`[AI-AGENT] Agent is disabled for user ${userId}`);
    return { sent: false, reason: "agent_disabled" };
  }

  // 4.5. فحص قنوات الإخراج (Output Channels: Text Reply & Voice Reply)
  // Text Reply: مفعل إذا كان مفعل عاماً ولم يعطله المستخدم لهذا الـ Contact
  const isTextOutEnabled = (agent.textRepliesEnabled ?? true) && (contact.textAiEnabled !== false);

  // 1. Integration: هل تكامل ElevenLabs مربوط ومفعل بالمفتاح؟
  const voiceApiKey = agent.elevenLabsApiKey
    ? (isEncrypted(agent.elevenLabsApiKey) ? decryptToken(agent.elevenLabsApiKey) : agent.elevenLabsApiKey)
    : null;
  const isElevenLabsConnected = Boolean(agent.elevenLabsEnabled && voiceApiKey?.trim());

  // 2. Output Decision: هل الرد الصوتي مفعّل كقناة إخراج للـ AI Agent؟
  const isVoiceOutputEnabled = Boolean(agent.voiceRepliesEnabled);

  // Voice Out ينفذ فقط إذا: التكامل مربوط + الرد الصوتي مفعّل + المحادثة لم تلغِ الصوت (Opt-out)
  const isVoiceOutEnabled = isElevenLabsConnected && isVoiceOutputEnabled && !contact.voiceOptOut;

  // إذا كانت القناتان معطلتين، لا داعي لتوليد رد
  if (!isTextOutEnabled && !isVoiceOutEnabled) {
    console.log(`[AI-AGENT] Both Text Reply and Voice Reply are disabled for ${from}`);
    return { sent: false, reason: "both_replies_disabled" };
  }

  // 5. فحص الإيقاف المؤقت إذا رد إنسان مؤخراً (Human Pause Check)
  const lastManualOutbound = await prisma.messageQueue.findFirst({
    where: {
      userId,
      toPhone: from,
      campaignId: null,
      status: { in: ["sent", "failed"] },
    },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  if (lastManualOutbound?.sentAt) {
    const minsSince =
      (Date.now() - lastManualOutbound.sentAt.getTime()) / 60_000;
    if (minsSince < (agent.pauseMinutes ?? 10)) {
      console.log(
        `[AI-AGENT] Paused — human replied ${minsSince.toFixed(1)}m ago for ${from}`
      );
      return { sent: false, reason: "paused_human_reply" };
    }
  }

  // 6. بناء رسائل المحادثة (Conversation History) — تشمل جميع الرسائل المجمعة خلال الـ Debounce
  const recentMsgs = await prisma.message.findMany({
    where: { contactId, userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { content: true, direction: true, type: true, mediaUrl: true },
  });

  if (!recentMsgs.length) {
    return { sent: false, reason: "no_messages" };
  }

  const aiMessages: ConversationMessage[] = recentMsgs
    .reverse()
    .filter((m) => m.content?.trim())
    .map((m) => ({
      role:
        m.direction === MessageDirection.inbound
          ? ("user" as const)
          : ("assistant" as const),
      content: m.content!.trim(),
      imageUrl:
        m.type === MessageType.image && m.mediaUrl ? m.mediaUrl : undefined,
    }));

  if (!aiMessages.length) {
    return { sent: false, reason: "no_valid_text_messages" };
  }

  // نص البحث عن المنتجات / المعرفة: دمج آخر رسائل واردة من العميل للحصول على السياق الكامل
  const inboundTexts = recentMsgs
    .filter((m) => m.direction === MessageDirection.inbound && m.content?.trim())
    .map((m) => m.content!.trim());
  const combinedSearchText =
    inboundTexts.slice(0, 3).reverse().join(" ") || inboundTexts[0] || "";

  // 7. جلب مصادر المعرفة المهيكلة (المنتجات، السياسات، الـ Guardrails، سلوك البيع، موقع الويب)
  const { getRelevantProducts, getSuggestedProducts } = await import(
    "@/lib/product-search"
  );

  const relevantProducts = await getRelevantProducts(
    userId,
    combinedSearchText,
    5
  );

  const [policies, guardrails, salesSettings, websiteSettings, customerServiceSettings, faqs, issues] =
    await Promise.all([
      prisma.brandPolicy.findMany({
        where: { userId },
        select: { type: true, title: true, content: true },
      }),
      prisma.aIGuardrail.findUnique({
        where: { userId },
        select: {
          noInventPrices: true,
          noInventProducts: true,
          noMentionCompetitors: true,
          noSharePersonal: true,
          strictKnowledgeOnly: true,
          alwaysHandoffComplaints: true,
          responseStyle: true,
          customRules: true,
        },
      }),
      prisma.salesBehaviorSettings.findUnique({ where: { userId } }),
      prisma.websiteCrawlSettings.findUnique({
        where: { userId },
        select: { isEnabled: true },
      }),
      prisma.customerServiceSettings.findUnique({ where: { userId } }),
      prisma.brandFAQ.findMany({
        where: { userId },
        select: { question: true, answer: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.customerIssue.findMany({
        where: { userId },
        select: { problem: true, resolution: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  let suggestedProducts: import("@/lib/product-search").SuggestedProduct[] = [];
  if (
    relevantProducts.length > 0 &&
    salesSettings &&
    (salesSettings.suggestAlternatives ||
      salesSettings.suggestUpsell ||
      salesSettings.suggestCrossSell)
  ) {
    const primary = relevantProducts[0];
    const fullPrimary = await prisma.product.findUnique({
      where: { id: primary.id },
      select: { id: true, category: true, price: true, relatedProductIds: true },
    });
    if (fullPrimary) {
      suggestedProducts = await getSuggestedProducts(
        userId,
        fullPrimary,
        salesSettings,
        Math.min(salesSettings.maxSuggestedProducts, 3)
      );
    }
  }

  const websiteKnowledge = websiteSettings?.isEnabled
    ? await (
        await import("@/lib/website-search")
      ).getRelevantWebsiteKnowledge(userId, combinedSearchText, 3)
    : [];

  const hasCustomerServiceKnowledge =
    !!customerServiceSettings?.generalSupportInfo?.trim() ||
    !!customerServiceSettings?.supportProcess?.trim() ||
    !!customerServiceSettings?.escalationInstructions?.trim() ||
    faqs.length > 0 ||
    issues.length > 0;

  // 8. استدعاء نموذج الذكاء الاصطناعي
  const result = await getAIReply(
    aiMessages,
    {
      brandName: agent.brandName,
      businessDesc: agent.businessDesc,
      productsInfo: agent.productsInfo,
      pricingInfo: agent.pricingInfo,
      workingHours: agent.workingHours,
      tone: agent.tone,
      systemPrompt: agent.systemPrompt,
      languageMode: agent.languageMode,
      websiteUrl: agent.websiteUrl,
      websiteButtonText: agent.websiteButtonText,
      relevantProducts:
        relevantProducts.length > 0 ? relevantProducts : undefined,
      suggestedProducts:
        suggestedProducts.length > 0 ? suggestedProducts : undefined,
      salesBehavior: salesSettings
        ? {
            goal: salesSettings.goal,
            suggestDiscounts: salesSettings.suggestDiscounts,
          }
        : undefined,
      websiteKnowledge:
        websiteKnowledge.length > 0 ? websiteKnowledge : undefined,
      policies: policies.length > 0 ? policies : undefined,
      customerService: hasCustomerServiceKnowledge
        ? {
            generalSupportInfo: customerServiceSettings?.generalSupportInfo,
            supportProcess: customerServiceSettings?.supportProcess,
            escalationInstructions: customerServiceSettings?.escalationInstructions,
            faqs: faqs.length > 0 ? faqs : undefined,
            issues: issues.length > 0 ? issues : undefined,
          }
        : undefined,
      guardrails: guardrails ?? undefined,
    },
    agent.provider as "gemini" | "openai"
  );

  if (!result.ok) {
    console.error(`[AI-AGENT] Generation error:`, result.error);
    return { sent: false, reason: result.error };
  }

  if (result.offTopic) {
    console.log(
      `[AI-AGENT] Off-topic — no reply sent for "${combinedSearchText}"`
    );
    return { sent: false, reason: "off_topic" };
  }

  if (!result.reply?.trim()) {
    return { sent: false, reason: "empty_reply" };
  }

  // 9. التعامل مع طلب التحويل لموظف بشري (Handoff)
  if (result.action === "handoff") {
    const handoffAtDate = new Date();
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        aiStatus: "NEEDS_HUMAN",
        handoffReason: result.reason ?? "الـ AI طلب تحويل المحادثة لإنسان",
        handoffAt: handoffAtDate,
      },
    });
    console.log(
      `[AI-HANDOFF] Conversation handed off to human for contact=${contact.id} (reason: ${result.reason})`
    );
    await notifyAiHandoffNeeded(
      userId,
      contact.name ?? from,
      contact.id,
      result.reason ?? null,
      result.priority ?? "normal"
    );

    // جدولة Auto-Resume إذا كانت الميزة مفعّلة
    if (agent.handoffResumeMinutes != null && agent.handoffResumeMinutes > 0) {
      await inngest
        .send({
          name: "ai-agent/handoff-resume-check",
          data: {
            userId,
            contactId: contact.id,
            handoffAt: handoffAtDate.toISOString(),
          },
        })
        .catch((e) =>
          console.error(
            "[AI-HANDOFF] Failed to schedule handoff-resume-check event:",
            e
          )
        );
    }
  }

  // 10. تسجيل استهلاك التوكنز
  if (result.tokensUsed) {
    void incrementAITokens(userId, result.tokensUsed);
  }

  // 11. استخراج صورة أول منتج متطابق (Product Image Resolution)
  let productImageUrl: string | undefined;
  if (result.productIds?.length && relevantProducts.length > 0) {
    const retrievedIdSet = new Set([
      ...relevantProducts.map((p) => p.id),
      ...suggestedProducts.map((p) => p.id),
    ]);
    const validIds = result.productIds.filter((id) => retrievedIdSet.has(id));

    if (validIds.length > 0) {
      const productWithImage = await prisma.product.findFirst({
        where: { id: validIds[0], userId, isActive: true },
        select: { images: true },
      });
      if (productWithImage?.images?.length) {
        productImageUrl = productWithImage.images[0];
      }
    }
  }

  // 12. إرسال الرسالة عبر Meta WhatsApp Cloud API وتوثيقها في قاعدة البيانات
  const decryptedToken = decryptToken(account.accessToken);
  const apiBase = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.phoneNumberId}/messages`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${decryptedToken}`,
  };

  let sentWhatsappId: string | undefined;
  let sentVoiceWhatsappId: string | undefined;
  const sentAt = new Date();

  // ── Output Channel 1: Text Reply (إذا كان مفعل) ─────────────────────────
  if (isTextOutEnabled) {
    // إرسال صورة مع Caption إذا وُجدت
    if (productImageUrl?.trim()) {
      const imgRes = await fetch(apiBase, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "image",
          image: {
            link: productImageUrl.trim(),
            caption: result.reply || undefined,
          },
        }),
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        sentWhatsappId = imgData?.messages?.[0]?.id as string | undefined;
        await prisma.$transaction([
          prisma.message.create({
            data: {
              userId,
              contactId: contact.id,
              content: result.reply || null,
              mediaUrl: productImageUrl,
              type: MessageType.image,
              direction: MessageDirection.outbound,
              status: MessageStatus.sent,
              senderType: MessageSenderType.ai,
              whatsappId: sentWhatsappId,
              sentAt,
            },
          }),
          prisma.contact.update({
            where: { id: contact.id },
            data: { lastAiRepliedAt: sentAt },
          }),
        ]);
      } else {
        const err = await imgRes.text();
        console.error(`[AI-AGENT] Image send failed for ${from}:`, err);
      }
    }

    // إرسال نص إذا لم يتم إرسال صورة
    if (!sentWhatsappId && result.reply?.trim()) {
      const metaRes = await fetch(apiBase, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: result.reply },
        }),
      });

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        sentWhatsappId = metaData?.messages?.[0]?.id as string | undefined;

        await prisma.$transaction([
          prisma.message.create({
            data: {
              userId,
              contactId: contact.id,
              content: result.reply,
              type: MessageType.text,
              direction: MessageDirection.outbound,
              status: MessageStatus.sent,
              senderType: MessageSenderType.ai,
              whatsappId: sentWhatsappId,
              sentAt,
            },
          }),
          prisma.contact.update({
            where: { id: contact.id },
            data: { lastAiRepliedAt: sentAt },
          }),
        ]);
      } else {
        const err = await metaRes.text();
        console.error(`[AI-AGENT] Meta text send failed for ${from}:`, err);
      }
    }
  }

  // ── Output Channel 2: Voice Reply (إذا كان مفعل) ─────────────────────────
  // نفس finalTextReply يتم تحويله لصوت عبر ElevenLabs TTS وإرساله كـ WhatsApp audio
  // - لا يولد AI response جديد
  // - لا يخصم AI tokens إضافية (تم حسابها بالفعل في الرد النصي)
  // - فشل Voice لا يؤثر على الرسالة النصية التي تم إرسالها بالفعل (Non-blocking)
  if (isVoiceOutEnabled && result.reply?.trim()) {
    try {
      const voiceResult = await generateVoiceReply({
        apiKey: voiceApiKey!.trim(),
        textReply: result.reply.trim(),
        voiceId: agent.elevenLabsVoiceId,
        agentId: agent.elevenLabsAgentId,
        modelId: agent.elevenLabsModelId,
      });

      if (voiceResult.ok && voiceResult.audioBuffer) {
        const audioUrl = await uploadAudioToCloudinary(voiceResult.audioBuffer);
        if (audioUrl) {
          const audioRes = await fetch(apiBase, {
            method: "POST",
            headers,
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: from,
              type: "audio",
              audio: { link: audioUrl },
            }),
          });

          if (audioRes.ok) {
            const audioData = await audioRes.json();
            sentVoiceWhatsappId = audioData?.messages?.[0]?.id as string | undefined;
            const audioSentAt = new Date();

            await prisma.$transaction([
              prisma.message.create({
                data: {
                  userId,
                  contactId: contact.id,
                  content: result.reply,
                  type: MessageType.audio,
                  direction: MessageDirection.outbound,
                  status: MessageStatus.sent,
                  senderType: MessageSenderType.ai,
                  whatsappId: sentVoiceWhatsappId,
                  mediaUrl: audioUrl,
                  sentAt: audioSentAt,
                },
              }),
              prisma.contact.update({
                where: { id: contact.id },
                data: { lastAiRepliedAt: audioSentAt },
              }),
            ]);
            console.log(`[VOICE-REPLY] ✓ Sent audio message to ${from}`);
          } else {
            console.error("[VOICE-REPLY] WhatsApp audio send failed:", await audioRes.text());
          }
        } else {
          console.error("[VOICE-REPLY] Cloudinary audio upload failed");
        }
      } else {
        console.error("[VOICE-REPLY] TTS generation failed:", voiceResult.error);
      }
    } catch (voiceErr) {
      console.error("[VOICE-REPLY] Non-blocking voice reply error:", voiceErr);
    }
  }

  // 13. جدولة Conversation Nudge إذا كان الـ AI يتوقع رداً من العميل
  if (result.expectsReply && contact.id) {
    await inngest
      .send({
        name: "agent-conversation.nudge-check",
        data: {
          contactId: contact.id,
          userId,
          triggerMessageAt: sentAt.toISOString(),
        },
      })
      .catch((e) =>
        console.error("[NUDGE] Failed to schedule nudge-check event:", e)
      );
  }

  const finalWhatsappMsgId = sentWhatsappId || sentVoiceWhatsappId;
  // تحقق نهائي بعد محاولات إرسال النص أو الصوت
  if (!finalWhatsappMsgId) {
    console.error(`[AI-AGENT] No message sent to ${from} (text/voice send failed or empty)`);
    return { sent: false, reason: "no_message_sent" };
  }

  console.log(
    `[AI-AGENT] ✓ Sent debounced AI reply to ${from} via "${agent.provider}" (text: ${Boolean(sentWhatsappId)}, voice: ${Boolean(sentVoiceWhatsappId)})`
  );
  return { sent: true, whatsappMsgId: finalWhatsappMsgId };
}

/**
 * دالة توثيق الفشل النهائي لرد الـ AI Agent بعد نفاد كافة محاولات الـ Retry.
 * (أ) تسجيل رسالة فاشلة في جدول Message لتظهر في تايم لاين وسجل الأخطاء بتقارير الأتمتة.
 * (ب) إرسال إشعار فوري لصاحب الحساب عبر notifyAutomationFailed.
 */
export async function recordFinalAIReplyFailure(params: {
  userId: string;
  contactId: string;
  from: string;
  reason: string;
}) {
  const { userId, contactId, from, reason } = params;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { name: true, phone: true },
  });

  // (أ) تسجيل رسالة فاشلة — عشان تظهر في تايم لاين وerrorLog تقارير الأتمتة
  await prisma.message.create({
    data: {
      userId,
      contactId,
      direction: MessageDirection.outbound,
      senderType: MessageSenderType.ai,
      status: MessageStatus.failed,
      type: MessageType.text,
      content: null,
      error: reason,
    },
  });

  // (ب) إشعار لصاحب البيزنس — إعادة استخدام نظام الإشعارات الموجود أصلاً
  await notifyAutomationFailed(
    userId,
    "Wani (الرد الآلي)",
    contact?.name || contact?.phone || from,
    contactId,
    reason,
  ).catch((e) =>
    console.error("[AI-AGENT] Failed to send failure notification:", e)
  );

  console.error(
    `[AI-AGENT] ✗ FINAL FAILURE after retries exhausted — contact=${contactId} reason=${reason}`
  );
}
