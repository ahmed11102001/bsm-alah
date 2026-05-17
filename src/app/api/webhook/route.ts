import { after, NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { checkFeature } from "@/lib/plan-guard";
import { MessageDirection, MessageStatus, MessageType, TriggerType, ReplyType } from "@/types/enums";
import { notifyNewMessage } from "@/lib/notifications";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { downloadFromMetaAndUpload } from "@/lib/cloudinary";
import { normalizePhone } from "@/lib/phone";
import { callVoiceAgent, uploadAudioToCloudinary } from "@/lib/elevenlabs";

// -----------------------------------------------------------------------------
// HELPER: ?????? ?? ????? Meta (HMAC-SHA256)
// Meta ????? header: x-hub-signature-256 = "sha256=<hex>"
// ???? ????? ??? ??? ?? ?????? ???? ??????? ???????
// -----------------------------------------------------------------------------
async function verifyMetaSignature(
  req: NextRequest
): Promise<{ valid: boolean; rawBody: string }> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[WEBHOOK] WHATSAPP_APP_SECRET is not set — rejecting all requests");
    return { valid: false, rawBody: "" };
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!signature.startsWith("sha256=")) {
    return { valid: false, rawBody: "" };
  }

  const rawBody = await req.text();

  const expectedHex = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expected = Buffer.from(`sha256=${expectedHex}`, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length) {
    return { valid: false, rawBody };
  }

  return { valid: timingSafeEqual(expected, received), rawBody };
}

// -----------------------------------------------------------------------------
// GET: ?????? ?? ??? Webhook (??????? ????? ?? Meta)
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[WEBHOOK] WHATSAPP_VERIFY_TOKEN is not set");
    return new NextResponse("Server misconfiguration", { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// -----------------------------------------------------------------------------
// POST: ?????? ??????? ???????? ??????? ?? Meta
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Step 1: ?????? ?? ??????? ????? ??? ?? ??????
  const { valid, rawBody } = await verifyMetaSignature(req);

  if (!valid) {
    console.warn("[WEBHOOK] Invalid or missing signature — request rejected");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid object" }, { status: 404 });
    }

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    const wabaIdFromMeta  = entry?.id;
    const phoneIdFromMeta = value?.metadata?.phone_number_id;

    const accountOwner = await prisma.whatsAppAccount.findFirst({
      where: {
        OR: [
          { wabaId: wabaIdFromMeta },
          { phoneNumberId: phoneIdFromMeta },
        ],
      },
    });

    if (!accountOwner) {
      return NextResponse.json({ status: "ignored" });
    }

    const userId = accountOwner.userId;

    // Step 2: ??????? ?????? (Delivered / Read / Failed)
    if (value?.statuses?.length) {
      const status = value.statuses[0];

      // ??? ??????? ????? ???? ???? ??? campaignId
      const relatedMsg = await prisma.message.findFirst({
        where:  { whatsappId: status.id, userId },
        select: { id: true, campaignId: true },
      });

      await prisma.message.updateMany({
        where: { whatsappId: status.id, userId },
        data: {
          status: mapStatus(status.status),
          ...(status.status === "delivered" && { deliveredAt: new Date() }),
          ...(status.status === "read"      && { readAt:      new Date() }),
        },
      });

      // ?? ??????? ?? ?? ???? — ???? ?????? ??????
      if (relatedMsg?.campaignId) {
        const campaignId = relatedMsg.campaignId;
        if (status.status === "delivered") {
          await prisma.campaign.update({
            where: { id: campaignId },
            data:  { deliveredCount: { increment: 1 } },
          });
        } else if (status.status === "read") {
          await prisma.campaign.update({
            where: { id: campaignId },
            data:  { readCount: { increment: 1 } },
          });
        }
      }
    }

    // Step 3: ??????? ??????? (Inbound Messages)
    if (value?.messages?.length) {
      const msg  = value.messages[0];
      const from = normalizePhone(msg.from);
      if (!from) {
        return NextResponse.json({ status: "invalid_phone_ignored" });
      }

      // ?????? ??? Reaction
      if (msg.type === "reaction") {
        const reactionEmoji = msg.reaction?.emoji ?? "";
        const reactedMsgId  = msg.reaction?.message_id ?? "";

        if (reactedMsgId) {
          const original = await prisma.message.findFirst({
            where:  { whatsappId: reactedMsgId, userId },
            select: { id: true, reactions: true },
          });

          if (original) {
            const existingReactions = (original.reactions as any[] ?? []);
            const filtered = existingReactions.filter((r: any) => r.senderId !== from);
            const updated  = reactionEmoji
              ? [...filtered, { emoji: reactionEmoji, senderId: from }]
              : filtered;

            await prisma.message.update({
              where: { id: original.id },
              data:  { reactions: updated },
            });
          }
        }
        return NextResponse.json({ status: "reaction_processed" });
      }

      // ??? ??????? ????? ??? ????? ??????
      const existing = await prisma.message.findFirst({
        where: { whatsappId: msg.id, userId },
      });

      if (existing) {
        return NextResponse.json({ status: "duplicate_ignored" });
      }

      // ????? ??? ???????
      let type: MessageType       = MessageType.text;
      let content                 = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "image") {
        type    = MessageType.image;
        content = msg.image?.caption || "Image";
        const metaImageId = msg.image?.id as string | undefined;
        if (metaImageId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaImageId, accountOwner.accessToken, {
              folder: "whatsapp-media/images",
            });
          } catch (uploadErr) {
            console.error("[WEBHOOK] Cloudinary upload failed for image:", uploadErr);
            mediaUrl = metaImageId;
          }
        }
      } else if (msg.type === "audio") {
        type    = MessageType.audio;
        content = "Audio message";
        const metaAudioId = msg.audio?.id as string | undefined;
        if (metaAudioId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaAudioId, accountOwner.accessToken, {
              folder: "whatsapp-media/audio",
            });
          } catch (uploadErr) {
            console.error("[WEBHOOK] Cloudinary upload failed for audio:", uploadErr);
            mediaUrl = metaAudioId;
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where:  { phone_userId: { phone: from, userId } },
          // deletedAt: null ???? ?? ???????? ???? ?????? ???? ???? ??? ???? ????? ?????
          update: { lastMessageAt: new Date(), unreadCount: { increment: 1 }, deletedAt: null },
          create: { phone: from, userId, lastMessageAt: new Date(), unreadCount: 1 },
        });

        // ?? ?? ????? ????? ????????? ?? ?????? — ?????? ???? ???????? ???? ???????
        await tx.message.updateMany({
          where: { contactId: contact.id, userId, deletedAt: { not: null } },
          data:  { deletedAt: null },
        });

        await tx.message.create({
          data: {
            userId,
            contactId:  contact.id,
            content,
            type,
            direction:  MessageDirection.inbound,
            status:     MessageStatus.delivered,
            whatsappId: msg.id,
            mediaUrl,
          },
        });
      });

      // ????? ????? ????? ?????
      await notifyNewMessage(userId, from);

      // Step 4: ????? ??????? ??? ????? ???? ?? Meta — ????? ??? Vercel
      if (type === MessageType.text && content.trim()) {
        after(async () => {
          try {
            await handleAutomation({ userId, from, messageText: content, accountOwner });
          } catch (err) {
            console.error("[AUTOMATION] Unhandled error:", err);
          }
        });
      }
    }

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("[WEBHOOK] Processing error:", error);
    // ???? 200 ?????? ???? Meta ?? ????? ???????? ????? flood
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

// -----------------------------------------------------------------------------
// AUTOMATION: ???? ??????? — ??????? ??? ??? ??????? ?????? 200 ?? Meta
//
// ???????:
//   0. FIRST_MESSAGE  — ????? ????? ???? ????? ?? ??????
//   1. Keyword Bot    — ?? ???? ???? ??? ???? ???????
//   2. AI Agent       — ?? ??? ?? ???? keyword match
// -----------------------------------------------------------------------------
async function handleAutomation(ctx: {
  userId:       string;
  from:         string;
  messageText:  string;
  accountOwner: { accessToken: string; phoneNumberId: string };
}) {
  const { userId, from, messageText, accountOwner } = ctx;
  const textLower = messageText.toLowerCase().trim();

  // -- 0: Voice Agent — ?? ????? ??? ???????? ??? ?????? ElevenLabs ?? ?? ???? --
  const contactRecord = await prisma.contact.findFirst({
    where:  { phone: from, userId },
    select: { id: true, voiceAgentEnabled: true },
  });

  if (contactRecord?.voiceAgentEnabled) {
    // ── Plan guard: Voice Agent — enterprise فقط ──────────────────────────
    const voiceGuard = await checkFeature(userId, "aiAgent");
    if (!voiceGuard.allowed) {
      console.log(`[VOICE-AGENT] Blocked — plan doesn't include AI for ${userId}`);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    const agentSettings = await prisma.aIAgent.findUnique({
      where:  { userId },
      select: { elevenLabsEnabled: true, elevenLabsApiKey: true, elevenLabsAgentId: true },
    });

    if (
      agentSettings?.elevenLabsEnabled &&
      agentSettings.elevenLabsApiKey?.trim() &&
      agentSettings.elevenLabsAgentId?.trim()
    ) {
      // ??? ??? 10 ????? ???????? ?? history ??? Agent
      const recentMsgs = await prisma.message.findMany({
        where:   { contactId: contactRecord.id, userId, type: MessageType.text },
        orderBy: { createdAt: "desc" },
        take:    10,
        select:  { content: true, direction: true },
      });

      const conversationHistory = recentMsgs
        .reverse()
        .filter(m => m.content)
        .map(m => ({
          role:    m.direction === "inbound" ? "user" as const : "assistant" as const,
          content: m.content!,
        }));

      console.log(`[VOICE-AGENT] Calling ElevenLabs for ${from}`);

      const result = await callVoiceAgent({
        agentId:            agentSettings.elevenLabsAgentId,
        apiKey:             agentSettings.elevenLabsApiKey,
        userText:           messageText,
        conversationHistory,
      });

      if (result.ok && result.audioBuffer) {
        // ???? ??? audio ??? Cloudinary
        const audioUrl = await uploadAudioToCloudinary(result.audioBuffer);

        if (audioUrl) {
          // ???? ??? audio ??? ?????? ?? voice note
          const metaRes = await fetch(
            `https://graph.facebook.com/v20.0/${accountOwner.phoneNumberId}/messages`,
            {
              method:  "POST",
              headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${accountOwner.accessToken}`,
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to:   from,
                type: "audio",
                audio: { link: audioUrl },
              }),
            }
          );

          if (metaRes.ok) {
            const metaData      = await metaRes.json();
            const whatsappMsgId = metaData?.messages?.[0]?.id as string | undefined;

            // ???? ??????? ?? ??? DB
            await prisma.message.create({
              data: {
                userId,
                contactId:  contactRecord.id,
                content:    result.textResponse ?? "[Voice Agent Reply]",
                type:       MessageType.audio,
                direction:  MessageDirection.outbound,
                status:     MessageStatus.sent,
                whatsappId: whatsappMsgId,
                mediaUrl:   audioUrl,
                sentAt:     new Date(),
              },
            });

            console.log(`[VOICE-AGENT] ? Audio reply sent to ${from}`);
          } else {
            console.error("[VOICE-AGENT] WhatsApp send failed:", await metaRes.text());
          }
        } else {
          console.error("[VOICE-AGENT] Cloudinary upload failed");
        }
      } else {
        console.error("[VOICE-AGENT] callVoiceAgent failed:", result.error);
      }

      return; // ?? ???? ??? keyword ?? ??? AI
    }
  }

  // -- 2: FIRST_MESSAGE — ????? ??????? ???? ????? -------------------------
  // ??????? ?????? ?? ??? DB ??? ?? handleAutomation ?????
  // ??? ??? ??????? = 1 ???? ?? ??? ????? ?? ?????? ??
  const contactForFirst = contactRecord ?? await prisma.contact.findFirst({
    where:  { phone: from, userId },
    select: { id: true },
  });

  if (contactForFirst) {
    const msgCount = await prisma.message.count({
      where: { contactId: contactForFirst.id, userId },
    });

    if (msgCount === 1) {
      const welcomeRule = await prisma.automationRule.findFirst({
        where:   { userId, triggerType: TriggerType.FIRST_MESSAGE, isEnabled: true },
        orderBy: { createdAt: "asc" },
        select:  { id: true, name: true, replyContent: true },
      });

      if (welcomeRule?.replyContent?.trim()) {
        console.log(`[BOT] FIRST_MESSAGE ? "${welcomeRule.name}" for ${from}`);
        await sendReply({
          userId, from,
          replyText:    welcomeRule.replyContent.trim(),
          accountOwner,
          ruleName:     welcomeRule.name,
        });
        return; // ?? ???? ??? keyword ?? ??? AI
      }
    }
  }

  // -- 1: Keyword Bot — ??? ??????? ????????? ???????? ---------------------
  const keywordRules = await prisma.automationRule.findMany({
    where: {
      userId,
      isEnabled:   true,
      triggerType: TriggerType.KEYWORD,
      replyType:   ReplyType.TEXT,
    },
    orderBy: { createdAt: "asc" },
    select:  { id: true, name: true, triggerValue: true, replyContent: true, humanKeywords: true },
  });

  // Human takeover — ?? ?????? ?? ?????? ?? ?????? ???? ?????
  const humanTriggered = keywordRules.some(r =>
    r.humanKeywords?.some(kw => {
      const kn = kw?.toLowerCase().trim();
      return !!kn && textLower.includes(kn);
    })
  );
  if (humanTriggered) {
    await notifyNewMessage(userId, from);
    console.log(`[BOT] Human takeover triggered for ${from}`);
    return;
  }

  // Keyword match — ??? ?????
  const matched = keywordRules.find(r =>
    r.triggerValue?.trim() &&
    textLower.includes(r.triggerValue.toLowerCase().trim())
  );

  if (matched) {
    const replyText = matched.replyContent?.trim();
    if (!replyText) return;
    console.log(`[BOT] Keyword matched ? "${matched.name}" for "${messageText}"`);
    await sendReply({ userId, from, replyText, accountOwner, ruleName: matched.name });
    return;
  }

  // -- 2: AI Agent — ?? ???? keyword match ---------------------------------
  const agent = await prisma.aIAgent.findUnique({
    where:  { userId },
    select: {
      isEnabled: true, provider: true,
      brandName: true, businessDesc: true, productsInfo: true,
      pricingInfo: true, workingHours: true, tone: true,
      systemPrompt: true, pauseMinutes: true,
    },
  });

  if (!agent?.isEnabled) return;

  // ── Plan guard: AI Agent — enterprise فقط ──
  const aiPlanGuard = await checkFeature(userId, "aiAgent");
  if (!aiPlanGuard.allowed) {
    console.log(`[AI-AGENT] Blocked — plan doesn't include AI for ${userId}`);
    return;
  }


  // Pause check — ?? ???????? ??? ?????? ??????? ??? AI ????
  const lastManualOutbound = await prisma.messageQueue.findFirst({
    where:   { userId, toPhone: from, campaignId: null, status: { in: ["sent", "failed"] } },
    orderBy: { sentAt: "desc" },
    select:  { sentAt: true },
  });

  if (lastManualOutbound?.sentAt) {
    const minsSince = (Date.now() - lastManualOutbound.sentAt.getTime()) / 60_000;
    if (minsSince < (agent.pauseMinutes ?? 10)) {
      console.log(`[AI-AGENT] Paused — human replied ${minsSince.toFixed(1)}m ago for ${from}`);
      return;
    }
  }

  let aiMessages: ConversationMessage[] = [{ role: "user", content: messageText }];
  if (contactRecord) {
    const recentMsgs = await prisma.message.findMany({
      where:   { contactId: contactRecord.id, userId, type: MessageType.text },
      orderBy: { createdAt: "desc" },
      take:    20,
      select:  { content: true, direction: true },
    });
    const fromDb = recentMsgs
      .reverse()
      .filter(m => m.content?.trim())
      .map(m => ({
        role:    m.direction === MessageDirection.inbound ? "user" as const : "assistant" as const,
        content: m.content!.trim(),
      }));
    if (fromDb.length) aiMessages = fromDb;
  }

  const result = await getAIReply(
    aiMessages,
    {
      brandName:    agent.brandName,
      businessDesc: agent.businessDesc,
      productsInfo: agent.productsInfo,
      pricingInfo:  agent.pricingInfo,
      workingHours: agent.workingHours,
      tone:         agent.tone,
      systemPrompt: agent.systemPrompt,
    },
    agent.provider as "gemini" | "openai",
  );

  if (!result.ok) {
    console.error(`[AI-AGENT] Error:`, result.error);
    return;
  }

  if (result.offTopic) {
    console.log(`[AI-AGENT] Off-topic — no reply sent for "${messageText}"`);
    return;
  }

  if (!result.reply?.trim()) return;

  await sendReply({ userId, from, replyText: result.reply, accountOwner, ruleName: `AI/${agent.provider}` });
}

// -----------------------------------------------------------------------------
// Helper: ????? ???? ??? Meta API ????? ?? ??? DB
// -----------------------------------------------------------------------------
async function sendReply(ctx: {
  userId:       string;
  from:         string;
  replyText:    string;
  accountOwner: { accessToken: string; phoneNumberId: string };
  ruleName:     string;
}) {
  const { userId, from, replyText, accountOwner, ruleName } = ctx;

  const metaRes = await fetch(
    `https://graph.facebook.com/v20.0/${accountOwner.phoneNumberId}/messages`,
    {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accountOwner.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to:   from,
        type: "text",
        text: { body: replyText },
      }),
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.text();
    console.error(`[AUTOMATION] Meta send failed for ${from}:`, err);
    return;
  }

  const metaData      = await metaRes.json();
  const whatsappMsgId = metaData?.messages?.[0]?.id as string | undefined;

  const contact = await prisma.contact.findFirst({
    where:  { phone: from, userId },
    select: { id: true },
  });
  if (!contact) return;

  await prisma.message.create({
    data: {
      userId,
      contactId:  contact.id,
      content:    replyText,
      type:       MessageType.text,
      direction:  MessageDirection.outbound,
      status:     MessageStatus.sent,
      whatsappId: whatsappMsgId,
      sentAt:     new Date(),
    },
  });

  console.log(`[AUTOMATION] Done — replied to ${from} via "${ruleName}"`);
}

// -----------------------------------------------------------------------------
// Helper: ????? ????? ?????? ??? Enums ????? ????????
// -----------------------------------------------------------------------------
function mapStatus(waStatus: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    sent:      MessageStatus.sent,
    delivered: MessageStatus.delivered,
    read:      MessageStatus.read,
    failed:    MessageStatus.failed,
  };
  return map[waStatus] || MessageStatus.pending;
}
