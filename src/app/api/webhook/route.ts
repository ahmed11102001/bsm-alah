import { after, NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType, TriggerType, ReplyType } from "@prisma/client";
import { notifyNewMessage } from "@/lib/notifications";
import { getAIReply } from "@/lib/ai-agent";
import { downloadFromMetaAndUpload } from "@/lib/cloudinary";
import { normalizePhone } from "@/lib/phone";

// -------------------------------------------------------------------
// HELPER: Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØªÙˆÙ‚ÙŠØ¹ Meta (HMAC-SHA256)
// Meta Ø¨ØªØ¨Ø¹Øª header: x-hub-signature-256 = "sha256=<hex>"
// Ù„Ø§Ø²Ù… Ù†ØªØ­Ù‚Ù‚ Ù…Ù†Ù‡ Ù‚Ø¨Ù„ Ø£ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© Ù„Ù…Ù†Ø¹ Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø²ÙŠÙØ©
// -------------------------------------------------------------------
async function verifyMetaSignature(
  req: NextRequest
): Promise<{ valid: boolean; rawBody: string }> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[WEBHOOK] WHATSAPP_APP_SECRET is not set â€” rejecting all requests");
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

  // timingSafeEqual ÙŠÙ…Ù†Ø¹ Timing Attacks
  if (expected.length !== received.length) {
    return { valid: false, rawBody };
  }

  return { valid: timingSafeEqual(expected, received), rawBody };
}

// -------------------------------------------------------------------
// GET: Webhook Verification (Ù„Ù„ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ÙˆÙ„ Ù…Ø¹ Ù…ÙŠØªØ§)
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// POST: Incoming Webhook Events (Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ ÙˆØ§Ù„Ø­Ø§Ù„Ø§Øª)
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // â”€â”€ Step 1: Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØªÙˆÙ‚ÙŠØ¹ Ø£ÙˆÙ„Ø§Ù‹ Ù‚Ø¨Ù„ Ø£ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { valid, rawBody } = await verifyMetaSignature(req);

  if (!valid) {
    console.warn("[WEBHOOK] Invalid or missing signature â€” request rejected");
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
      // Ù†Ø±Ø¬Ø¹ 200 Ø¹Ø´Ø§Ù† Meta Ù…Ø§ ØªØ¹ÙŠØ¯Ø´ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©
      return NextResponse.json({ status: "ignored" });
    }

    const userId = accountOwner.userId;

    // â”€â”€ Step 2: ØªØ­Ø¯ÙŠØ«Ø§Øª Ø§Ù„Ø­Ø§Ù„Ø© (Delivered / Read / Failed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (value?.statuses?.length) {
      const status = value.statuses[0];
      await prisma.message.updateMany({
        where: { whatsappId: status.id, userId },
        data: {
          status: mapStatus(status.status),
          ...(status.status === "delivered" && { deliveredAt: new Date() }),
          ...(status.status === "read"      && { readAt:      new Date() }),
        },
      });
    }

    // â”€â”€ Step 3: Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„ÙˆØ§Ø±Ø¯Ø© (Inbound Messages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (value?.messages?.length) {
      const msg  = value.messages[0];
      const from = normalizePhone(msg.from);
      if (!from) {
        return NextResponse.json({ status: "invalid_phone_ignored" });
      }

      // â”€â”€ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù€ Reaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (msg.type === "reaction") {
        const reactionEmoji  = msg.reaction?.emoji ?? "";
        const reactedMsgId   = msg.reaction?.message_id ?? "";

        if (reactedMsgId) {
          const original = await prisma.message.findFirst({
            where:  { whatsappId: reactedMsgId, userId },
            select: { id: true, reactions: true },
          });

          if (original) {
            const existingReactions = (original.reactions as any[] ?? []);
            const filtered = existingReactions.filter((r: any) => r.senderId !== from);
            const updated = reactionEmoji
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

      // Ù…Ù†Ø¹ Ø§Ù„ØªÙƒØ±Ø§Ø± Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù…Ø¹Ø±Ù ÙˆØ§ØªØ³Ø§Ø¨
      const existing = await prisma.message.findFirst({
        where: { whatsappId: msg.id, userId },
      });

      if (existing) {
        return NextResponse.json({ status: "duplicate_ignored" });
      }

      // ØªØ­Ø¯ÙŠØ¯ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø­ØªÙˆÙ‰
      let type: MessageType       = MessageType.text;
      let content                 = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "image") {
        type    = MessageType.image;
        content = msg.image?.caption || "ðŸ“· Image";
        const metaImageId = msg.image?.id as string | undefined;
        if (metaImageId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaImageId, accountOwner.accessToken, {
              folder: "whatsapp-media/images",
            });
          } catch (uploadErr) {
            console.error("[WEBHOOK] Cloudinary upload failed for image, falling back to Meta ID:", uploadErr);
            mediaUrl = metaImageId;
          }
        }
      } else if (msg.type === "audio") {
        type    = MessageType.audio;
        content = "ðŸŽµ Audio message";
        const metaAudioId = msg.audio?.id as string | undefined;
        if (metaAudioId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaAudioId, accountOwner.accessToken, {
              folder: "whatsapp-media/audio",
            });
          } catch (uploadErr) {
            console.error("[WEBHOOK] Cloudinary upload failed for audio, falling back to Meta ID:", uploadErr);
            mediaUrl = metaAudioId;
          }
        }
      }

      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where:  { phone_userId: { phone: from, userId } },
          // deletedAt: null Ø¹Ø´Ø§Ù† Ù„Ùˆ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ÙƒØ§Ù†Øª Ø§ØªØ­Ø°ÙØª ØªØ±Ø¬Ø¹ ØªØ¸Ù‡Ø± Ù„Ù…Ø§ ÙŠØ¨Ø¹Øª Ø±Ø³Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø©
          update: { lastMessageAt: new Date(), unreadCount: { increment: 1 }, deletedAt: null },
          create: { phone: from, userId, lastMessageAt: new Date(), unreadCount: 1 },
        });

        // Ù„Ùˆ ÙÙŠ Ø±Ø³Ø§Ø¦Ù„ Ù‚Ø¯ÙŠÙ…Ø© Ù„Ù„ÙƒÙˆÙ†ØªØ§ÙƒØª Ø¯Ù‡ Ø§ØªØ­Ø°ÙØª â€” Ø§Ø±Ø¬Ø¹Ù‡Ø§ Ø¹Ø´Ø§Ù† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© ØªÙƒÙˆÙ† Ù…ØªÙƒØ§Ù…Ù„Ø©
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

      // Ø¥Ø´Ø¹Ø§Ø± Ø±Ø³Ø§Ù„Ø© ÙˆØ§Ø±Ø¯Ø© Ø¬Ø¯ÙŠØ¯Ø©
      await notifyNewMessage(userId, from);

      // â”€â”€ Step 4: ØªØ´ØºÙŠÙ„ Ø§Ù„Ø£ØªÙ…ØªØ© Ø¨Ø¹Ø¯ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø¯ Ù„Ù€ Meta Ø¨Ø´ÙƒÙ„ Ù…Ø¶Ù…ÙˆÙ† Ø¹Ù„Ù‰ Vercel â”€â”€
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
    // Ù†Ø±Ø¬Ø¹ 200 Ø¯Ø§ÙŠÙ…Ø§Ù‹ Ø¹Ø´Ø§Ù† Meta Ù…Ø§ ØªØ¹ÙŠØ¯Ø´ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© ÙˆØªØ¹Ù…Ù„ flood
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

// -------------------------------------------------------------------
// AUTOMATION: Ù…Ù†Ø·Ù‚ Ø§Ù„Ø£ØªÙ…ØªØ© â€” ÙŠÙØ´ØºÙŽÙ‘Ù„ Ø¨Ø¹Ø¯ Ø­ÙØ¸ Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙˆØ¥Ø±Ø³Ø§Ù„ 200 Ù„Ù€ Meta
// -------------------------------------------------------------------
async function handleAutomation(ctx: {
  userId:       string;
  from:         string;
  messageText:  string;
  accountOwner: { accessToken: string; phoneNumberId: string };
}) {
  const { userId, from, messageText, accountOwner } = ctx;
  const textLower = messageText.toLowerCase().trim();

  // â”€â”€ 1: Keyword Bot â€” Ø¬ÙŠØ¨ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…ÙØªØ§Ø­ÙŠØ© Ø§Ù„Ù…ÙØ¹Ù‘Ù„Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Human takeover keywords
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

  // Keyword match â€” Ø¨ÙŠØ±Ø¯ ÙÙˆØ±Ø§Ù‹ Ø¯Ø§ÙŠÙ…Ø§Ù‹
  const matched = keywordRules.find(r =>
    r.triggerValue?.trim() &&
    textLower.includes(r.triggerValue.toLowerCase().trim())
  );

  if (matched) {
    const replyText = matched.replyContent?.trim();
    if (!replyText) return;
    console.log(`[BOT] Keyword matched â†’ "${matched.name}" for "${messageText}"`);
    await sendReply({ userId, from, replyText, accountOwner, ruleName: matched.name });
    return;
  }

  // â”€â”€ 2: AI Agent â€” Ù„Ùˆ Ù…ÙÙŠØ´ keyword match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Pause check â€” Ù„Ùˆ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø±Ø¯Ù‘ ÙŠØ¯ÙˆÙŠØ§Ù‹ Ù…Ø¤Ø®Ø±Ø§Ù‹
  const lastManualOutbound = await prisma.messageQueue.findFirst({
    where:   { userId, toPhone: from, campaignId: null, status: { in: ["sent", "failed"] } },
    orderBy: { sentAt: "desc" },
    select:  { sentAt: true },
  });

  if (lastManualOutbound?.sentAt) {
    const minsSince = (Date.now() - lastManualOutbound.sentAt.getTime()) / 60_000;
    if (minsSince < (agent.pauseMinutes ?? 10)) {
      console.log(`[AI-AGENT] Paused â€” human replied ${minsSince.toFixed(1)}m ago for ${from}`);
      return;
    }
  }

  // Call AI
  const result = await getAIReply(
    messageText,
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
    console.log(`[AI-AGENT] Off-topic â€” no reply sent for "${messageText}"`);
    return;
  }

  if (!result.reply?.trim()) return;

  await sendReply({ userId, from, replyText: result.reply, accountOwner, ruleName: `AI/${agent.provider}` });
}

// â”€â”€â”€ Helper: Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø¯ Ø¹Ø¨Ø± Meta ÙˆØ­ÙØ¸Ù‡ ÙÙŠ Ø§Ù„Ù€ DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  console.log(`[AUTOMATION] âœ“ Replied to ${from} via "${ruleName}"`);
}


// -------------------------------------------------------------------
// HELPER: ØªØ­ÙˆÙŠÙ„ Ø­Ø§Ù„Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ø¥Ù„Ù‰ Enums Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
// -------------------------------------------------------------------
function mapStatus(waStatus: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    sent:      MessageStatus.sent,
    delivered: MessageStatus.delivered,
    read:      MessageStatus.read,
    failed:    MessageStatus.failed,
  };
  return map[waStatus] || MessageStatus.pending;
}


