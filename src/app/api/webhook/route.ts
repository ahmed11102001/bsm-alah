import { after, NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { decryptToken, isEncrypted } from "@/lib/crypto";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";
import { checkFeature, checkAITokensLimit, incrementAITokens } from "@/lib/plan-guard";
import { MessageDirection, MessageStatus, MessageType, MessageSenderType, TriggerType, ReplyType } from "@/types/enums";
import {
  notifyNewMessage,
  notifyAiHandoffNeeded,
  notifyInteractiveButtonSelected,
  notifyAutomationFailed,
  notifyAutomationLoopStopped,
} from "@/lib/notifications";
import {
  processInteractiveButtonClick,
  supersedeWaitingInteractions,
  findEnabledAutomationStep,
  findAutomationRuleName,
  isHopLimitExceeded,
  INTERACTIVE_MENU_MAX_HOPS,
} from "@/lib/interactive-menu";
import { getAIReply, type ConversationMessage } from "@/lib/ai-agent";
import { downloadFromMetaAndUpload } from "@/lib/cloudinary";
import { normalizePhone } from "@/lib/phone";
import { callVoiceAgent, uploadAudioToCloudinary } from "@/lib/elevenlabs";
import { transcribeAudio, estimateWhisperTokens } from "@/lib/whisper";
import { warnDeprecatedSecretOnce } from "@/lib/env-deprecation";
import { inngest } from "@/inngest/client";

// -----------------------------------------------------------------------------
// HELPER: ?????? ?? ????? Meta (HMAC-SHA256)
// Meta ????? header: x-hub-signature-256 = "sha256=<hex>"
// ???? ????? ??? ??? ?? ?????? ???? ??????? ???????
// -----------------------------------------------------------------------------
async function verifyMetaSignature(
  req: NextRequest
): Promise<{ valid: boolean; rawBody: string }> {
  // META_APP_SECRET is the canonical name — WHATSAPP_APP_SECRET kept as fallback
  const appSecret = process.env.META_APP_SECRET ?? process.env.WHATSAPP_APP_SECRET;

  if (!process.env.META_APP_SECRET && process.env.WHATSAPP_APP_SECRET) {
    warnDeprecatedSecretOnce("[WEBHOOK]");
  }

  if (!appSecret) {
    console.error("[WEBHOOK] META_APP_SECRET is not set — rejecting all requests");
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
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
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

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const wabaIdFromMeta = entry?.id;
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

    // فك تشفير الـ token فور الجلب من DB
    accountOwner.accessToken = decryptToken(accountOwner.accessToken);

    const userId = accountOwner.userId;

    // Step 2: ??????? ?????? (Delivered / Read / Failed)
    if (value?.statuses?.length) {
      const status = value.statuses[0];

      // ??? ??????? ????? ???? ???? ??? campaignId
      const relatedMsg = await prisma.message.findFirst({
        where: { whatsappId: status.id, userId },
        select: { id: true, campaignId: true },
      });

      await prisma.message.updateMany({
        where: { whatsappId: status.id, userId },
        data: {
          status: mapStatus(status.status),
          ...(status.status === "delivered" && { deliveredAt: new Date() }),
          ...(status.status === "read" && { readAt: new Date() }),
        },
      });

      // ?? ??????? ?? ?? ???? — ???? ?????? ??????
      if (relatedMsg?.campaignId) {
        const campaignId = relatedMsg.campaignId;
        if (status.status === "delivered") {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { deliveredCount: { increment: 1 } },
          });
        } else if (status.status === "read") {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { readCount: { increment: 1 } },
          });
        }
      }
    }

    // Step 3: ??????? ??????? (Inbound Messages)
    if (value?.messages?.length) {
      const msg = value.messages[0];
      const from = normalizePhone(msg.from);
      if (!from) {
        console.warn(`[WEBHOOK] رقم مرفوض من normalizePhone: "${msg.from}" (userId: ${userId}) — الرسالة اتجاهلت ولم تُسجَّل`);
        return NextResponse.json({ status: "invalid_phone_ignored" });
      }

      // ?????? ??? Reaction
      if (msg.type === "reaction") {
        const reactionEmoji = msg.reaction?.emoji ?? "";
        const reactedMsgId = msg.reaction?.message_id ?? "";

        if (reactedMsgId) {
          const original = await prisma.message.findFirst({
            where: { whatsappId: reactedMsgId, userId },
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
              data: { reactions: updated },
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
      let type: MessageType = MessageType.text;
      let content = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "button") {
        type = MessageType.text;
        content = msg.button?.text || msg.button?.payload || "Button Click";
      } else if (msg.type === "interactive") {
        type = MessageType.text;
        const interactive = msg.interactive;
        content = interactive?.button_reply?.title || interactive?.list_reply?.title || "Interactive Reply";
      }

      // ─── Order Confirmation Flow ───
      const contextId = msg.context?.id as string | undefined;
      const payload = msg.type === "button"
        ? msg.button?.payload
        : msg.type === "interactive"
          ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id)
          : undefined;

      if (payload === "CONFIRM_ORDER" || payload === "CANCEL_ORDER") {
        const newStatus = payload === "CONFIRM_ORDER" ? "confirmed" : "cancelled";

        let order = contextId
          ? await prisma.storeOrder.findFirst({
            where: { userId, confirmationMessageId: contextId },
            include: { shopifyStore: { select: { shop: true, accessToken: true } } },
          })
          : null;

        // TODO: fallback لحد ما نتأكد إن كل الرسائل القديمة اتبعتت بعد التعديل ده
        if (!order) {
          order = await prisma.storeOrder.findFirst({
            where: { userId, customerPhone: from, status: "awaiting_confirmation" },
            orderBy: { orderedAt: "desc" },
            include: { shopifyStore: { select: { shop: true, accessToken: true } } },
          });
        }

        if (order) {
          await prisma.storeOrder.update({ where: { id: order.id }, data: { status: newStatus } });

          if (payload === "CONFIRM_ORDER") {
            const { notifyOrderConfirmed } = await import("@/lib/notifications");
            await notifyOrderConfirmed(userId, order.orderNumber || order.externalId, order.customerPhone);
          } else {
            const { notifyOrderCancelled } = await import("@/lib/notifications");
            await notifyOrderCancelled(userId, order.orderNumber || order.externalId, order.customerPhone);
          }

          // ── تحديث الحالة فعليًا في متجر شوبيفاي (لو الأوردر مصدره شوبيفاي) ──
          if (order.source === "shopify" && order.shopifyStore && order.shopifyStore.accessToken) {
            try {
              const shopifyToken = isEncrypted(order.shopifyStore.accessToken)
                ? decryptToken(order.shopifyStore.accessToken)
                : order.shopifyStore.accessToken;

              const { tagShopifyOrderConfirmed, cancelShopifyOrder } = await import("@/lib/shopify-api");
              const result = payload === "CONFIRM_ORDER"
                ? await tagShopifyOrderConfirmed(order.shopifyStore.shop, shopifyToken, order.externalId)
                : await cancelShopifyOrder(order.shopifyStore.shop, shopifyToken, order.externalId);

              if (!result.ok) {
                console.error(
                  `[SHOPIFY-ORDER-SYNC] Failed to ${payload === "CONFIRM_ORDER" ? "confirm" : "cancel"} order ${order.externalId} in Shopify:`,
                  result.error,
                );
                const { notifyShopifyOrderSyncFailed } = await import("@/lib/notifications");
                await notifyShopifyOrderSyncFailed(
                  userId,
                  order.orderNumber || order.externalId,
                  payload === "CONFIRM_ORDER" ? "confirm" : "cancel",
                  result.error ?? "unknown error",
                );
              } else {
                console.log(`[SHOPIFY-ORDER-SYNC] Order ${order.externalId} ${payload === "CONFIRM_ORDER" ? "tagged confirmed" : "cancelled"} in Shopify`);
              }
            } catch (shopifyErr) {
              // لا نكسر فلو تأكيد الطلب للعميل حتى لو فشل التحديث الخارجي في شوبيفاي
              console.error("[SHOPIFY-ORDER-SYNC] Unexpected error:", shopifyErr);
              const { notifyShopifyOrderSyncFailed } = await import("@/lib/notifications");
              await notifyShopifyOrderSyncFailed(
                userId,
                order.orderNumber || order.externalId,
                payload === "CONFIRM_ORDER" ? "confirm" : "cancel",
                shopifyErr instanceof Error ? shopifyErr.message : String(shopifyErr),
              );
            }
          }

          // ── متابعة تأكيد الأوردر — أول رد فوري (يحترم replyDelayMinutes) ──
          try {
            const { getSmartFollowUpSetting, handleOrderConfirmReply } = await import("@/lib/smart-followup");
            const settingOC = await getSmartFollowUpSetting(userId, "order_confirm");
            if (settingOC?.isEnabled) {
              const replyDelayMinutes = settingOC.replyDelayMinutes ?? 0;
              if (replyDelayMinutes > 0) {
                const { inngest } = await import("@/inngest/client");
                await inngest.send({
                  name: "followup/action.send",
                  data: {
                    kind: "order_confirm",
                    recordId: order.id,
                    action: payload,
                    replyDelaySeconds: Math.round(replyDelayMinutes * 60),
                  },
                });
              } else {
                await handleOrderConfirmReply(order as any, {
                  payloadId: payload,
                  messageText: content,
                  accountOwner,
                  userId,
                });
              }
            }
          } catch (e) {
            console.error("[SmartFollowUp] order_confirm initial reply failed:", e);
          }
        }
      }
      // ────────────────────────────────

      // ─── Smart Follow-Up Flow ───
      let smartFollowUpHandled = false;

      try {
        const {
          resolveActiveFollowUpContext,
          handleShippingFollowUpReply,
          handleCartFollowUpReply,
          handleOrderConfirmReply,
          closeExpiredStageIfNeeded,
        } = await import("@/lib/smart-followup");

        const {
          resolveActiveCampaignFollowUpContext,
          handleCampaignFollowUpReply,
        } = await import("@/lib/campaign-followup");

        const ctx = await resolveActiveFollowUpContext({ userId, phone: from, contextId });

        if (ctx?.kind === "shipping" && ctx.order) {
          await closeExpiredStageIfNeeded("shipping", ctx.order).catch(() => { });

          const { getSmartFollowUpSetting } = await import("@/lib/smart-followup");
          const setting = await getSmartFollowUpSetting(ctx.order.userId, "shipping");
          const replyDelayMinutes = setting?.replyDelayMinutes ?? 0;

          if (replyDelayMinutes > 0) {
            // schedule delayed action via Inngest
            try {
              const { inngest } = await import("@/inngest/client");
              await inngest.send({
                name: "followup/action.send",
                data: {
                  kind: "shipping",
                  recordId: ctx.order.id,
                  action: payload,
                  replyDelaySeconds: Math.round(replyDelayMinutes * 60),
                },
              });
            } catch (e) {
              console.error("[SmartFollowUp] Failed to schedule delayed action:", e);
              // fallback to immediate handling
              await handleShippingFollowUpReply(ctx.order, {
                payloadId: payload,
                payloadTitle: content,
                messageText: content,
                accountOwner,
                userId,
              });
            }
          } else {
            await handleShippingFollowUpReply(ctx.order, {
              payloadId: payload,
              payloadTitle: content,
              messageText: content,
              accountOwner,
              userId,
            });
          }
          smartFollowUpHandled = true;
        } else if (ctx?.kind === "cart" && ctx.cart) {
          await closeExpiredStageIfNeeded("cart", ctx.cart).catch(() => { });

          const { getSmartFollowUpSetting } = await import("@/lib/smart-followup");
          const setting = await getSmartFollowUpSetting(ctx.cart.userId, "cart");
          const replyDelayMinutes = setting?.replyDelayMinutes ?? 0;

          if (replyDelayMinutes > 0) {
            try {
              const { inngest } = await import("@/inngest/client");
              await inngest.send({
                name: "followup/action.send",
                data: {
                  kind: "cart",
                  recordId: ctx.cart.id,
                  action: payload,
                  replyDelaySeconds: Math.round(replyDelayMinutes * 60),
                },
              });
            } catch (e) {
              console.error("[SmartFollowUp] Failed to schedule delayed action:", e);
              await handleCartFollowUpReply(ctx.cart, {
                payloadId: payload,
                payloadTitle: content,
                messageText: content,
                accountOwner,
                userId,
              });
            }
          } else {
            await handleCartFollowUpReply(ctx.cart, {
              payloadId: payload,
              payloadTitle: content,
              messageText: content,
              accountOwner,
              userId,
            });
          }
          smartFollowUpHandled = true;
        } else if (ctx?.kind === "order_confirm" && ctx.order) {
          const { getSmartFollowUpSetting } = await import("@/lib/smart-followup");
          const setting = await getSmartFollowUpSetting(ctx.order.userId, "order_confirm");
          const replyDelayMinutes = setting?.replyDelayMinutes ?? 0;

          if (replyDelayMinutes > 0) {
            try {
              const { inngest } = await import("@/inngest/client");
              await inngest.send({
                name: "followup/action.send",
                data: {
                  kind: "order_confirm",
                  recordId: ctx.order.id,
                  action: payload,
                  replyDelaySeconds: Math.round(replyDelayMinutes * 60),
                },
              });
            } catch (e) {
              await handleOrderConfirmReply(ctx.order as any, {
                payloadId: payload,
                messageText: content,
                accountOwner,
                userId,
              });
            }
          } else {
            await handleOrderConfirmReply(ctx.order as any, {
              payloadId: payload,
              messageText: content,
              accountOwner,
              userId,
            });
          }
          smartFollowUpHandled = true;
        }

        if (!smartFollowUpHandled) {
          const campRecord = await resolveActiveCampaignFollowUpContext({ userId, phone: from, contextId });
          if (campRecord) {
            const setting = await prisma.campaignFollowUpSetting.findFirst({
              where: { userId: campRecord.userId, isEnabled: true },
              orderBy: { createdAt: "desc" }
            });
            const replyDelayMinutes = setting?.replyDelayMinutes ?? 0;

            if (replyDelayMinutes > 0) {
              try {
                const { inngest } = await import("@/inngest/client");
                await inngest.send({
                  name: "campaign_followup/action.send" as any,
                  data: {
                    recordId: campRecord.id,
                    action: payload,
                    replyDelaySeconds: Math.round(replyDelayMinutes * 60),
                  },
                });
              } catch (e) {
                await handleCampaignFollowUpReply(campRecord, {
                  payloadId: payload,
                  messageText: content,
                  accountOwner,
                  userId,
                });
              }
            } else {
              await handleCampaignFollowUpReply(campRecord, {
                payloadId: payload,
                messageText: content,
                accountOwner,
                userId,
              });
            }
            smartFollowUpHandled = true;
          }
        }
      } catch (e) {
        console.error("[SmartFollowUp] Webhook handling error:", e);
      }
      // ────────────────────────────────

      if (msg.type === "image") {
        type = MessageType.image;
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
        type = MessageType.audio;
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
      } else if ((msg.type as string) === "video") {
        type = MessageType.video;
        content = (msg as any).video?.caption || "Video";
        const metaVideoId = (msg as any).video?.id as string | undefined;
        if (metaVideoId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaVideoId, accountOwner.accessToken, {
              folder: "whatsapp-media/videos",
            });
          } catch {
            mediaUrl = metaVideoId;
          }
        }
      } else if ((msg.type as string) === "document") {
        type = MessageType.document;
        content = (msg as any).document?.filename || "Document";
        const metaDocId = (msg as any).document?.id as string | undefined;
        if (metaDocId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaDocId, accountOwner.accessToken, {
              folder: "whatsapp-media/documents",
            });
          } catch {
            mediaUrl = metaDocId;
          }
        }
      } else if ((msg.type as string) === "sticker") {
        type = MessageType.sticker;
        content = "Sticker";
        const metaStickerId = (msg as any).sticker?.id as string | undefined;
        if (metaStickerId) {
          try {
            mediaUrl = await downloadFromMetaAndUpload(metaStickerId, accountOwner.accessToken, {
              folder: "whatsapp-media/stickers",
            });
          } catch {
            mediaUrl = metaStickerId;
          }
        }
      }

      const { contactId } = await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where: { phone_userId: { phone: from, userId } },
          // deletedAt: null ???? ?? ???????? ???? ?????? ???? ???? ??? ???? ????? ?????
          update: { lastMessageAt: new Date(), unreadCount: { increment: 1 }, deletedAt: null },
          create: { phone: from, userId, lastMessageAt: new Date(), unreadCount: 1 },
        });

        // ?? ?? ????? ????? ????????? ?? ?????? — ?????? ???? ???????? ???? ???????
        await tx.message.updateMany({
          where: { contactId: contact.id, userId, deletedAt: { not: null } },
          data: { deletedAt: null },
        });

        await tx.message.create({
          data: {
            userId,
            contactId: contact.id,
            content,
            type,
            direction: MessageDirection.inbound,
            status: MessageStatus.delivered,
            whatsappId: msg.id,
            mediaUrl,
          },
        });

        return { contactId: contact.id };
      });

      // ????? ????? ????? ?????
      await notifyNewMessage(userId, from);

      // ─── Conversation Nudge: العميل بعت رسالة جديدة → ألغي أي nudge مجدول ───
      // (لو مفيش nudge مجدول أصلاً، الـ cancel ده مجرد no-op — رخيص وآمن)
      // وصفّر العدّاد: الـ cap (nudge واحد) بتاع فترة السكوت اللي فاتت، مش
      // بتاع المحادثة كلها — لو سكت تاني بعد كده يستاهل nudge جديد.
      await Promise.all([
        inngest.send({
          name: "agent-conversation.nudge-cancel",
          data: { contactId },
        }),
        prisma.contact.update({
          where: { id: contactId },
          data: { nudgeCountInThread: 0 },
        }),
      ]).catch((e) => console.error("[NUDGE] Failed to cancel/reset nudge state:", e));

      // ─── Interactive Menu Button Flow ───
      let interactiveMenuHandled = false;
      const buttonId = msg.type === "button"
        ? msg.button?.payload
        : msg.type === "interactive"
          ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id)
          : undefined;

      if (buttonId && payload !== "CONFIRM_ORDER" && payload !== "CANCEL_ORDER" && !smartFollowUpHandled) {
        try {
          const { handled } = await processInteractiveButtonClick(
            {
              contactId,
              userId,
              phoneNumberId: accountOwner.phoneNumberId,
              buttonId,
              eventId: msg.id,
              from,
            },
            {
              executeNextStep: async (stepId) => {
                try {
                  await executeAutomationStep({
                    userId,
                    from,
                    contactId,
                    accountOwner,
                    stepId,
                    hops: 1,
                  });
                  return { ok: true };
                } catch (stepErr) {
                  return { ok: false, error: stepErr instanceof Error ? stepErr.message : String(stepErr) };
                }
              },
              notifyButtonSelected: async (ctx) => {
                await notifyInteractiveButtonSelected(
                  userId,
                  ctx.contactName,
                  ctx.contactId,
                  ctx.button.text,
                  ctx.automationName,
                );
              },
              notifyFailure: async (ctx, reason) => {
                await notifyAutomationFailed(
                  userId,
                  ctx.automationName,
                  ctx.contactName,
                  ctx.contactId,
                  reason,
                );
              },
            },
          );
          if (handled) interactiveMenuHandled = true;
        } catch (interactiveErr) {
          console.error("[INTERACTIVE-MENU] Button handling error:", interactiveErr);
        }
      }

      // Step 4: فحص الأتمتة بعد إرسال 200 لـ Meta — ينفذ عبر Vercel after
      const triggersAutomation =
        !smartFollowUpHandled &&
        !interactiveMenuHandled && (
          (type === MessageType.text && content.trim()) ||
          type === MessageType.image ||
          type === MessageType.audio
        );

      if (triggersAutomation) {
        after(async () => {
          try {
            await handleAutomation({
              userId,
              from,
              messageText: content,
              accountOwner,
              mediaUrl,
              mediaType: type, // text | image | audio
            });
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
  userId: string;
  from: string;
  messageText: string;
  accountOwner: { accessToken: string; phoneNumberId: string };
  mediaUrl?: string | null;
  mediaType?: MessageType;
}) {
  const { userId, from, accountOwner, mediaUrl, mediaType } = ctx;
  let messageText = ctx.messageText;
  let imageUrl: string | undefined;

  // ── Step 0: تحليل الصوت/الصورة (ChatGPT + Whisper بس) ──────────────────────
  // Gemini بيقدر يحلل صوت وصورة من غير وسيط (native multimodal) — مش متعمول
  // دلوقتي عشان ده محتاج تعديل تاني منفصل، فمؤقتاً بنسيبه زي ما هو.
  // ChatGPT (gpt-4o-mini) مش بيفهم صوت مباشرة، فلازم Whisper STT الأول،
  // والصور بتتبعتله كـ image_url عادي (Vision مدعومة أصلاً في الموديل).
  if (mediaType === MessageType.audio || mediaType === MessageType.image) {
    const providerRow = await prisma.aIAgent.findUnique({
      where: { userId },
      select: { provider: true },
    });
    const provider = providerRow?.provider ?? "gemini";

    if (provider !== "openai") {
      // TODO: تفعيل تحليل Gemini الأصلي للصوت/الصورة لاحقاً
      console.log(`[AUTOMATION] provider=gemini — ${mediaType} analysis not wired yet, skipping`);
      return;
    }

    if (mediaType === MessageType.audio) {
      if (!mediaUrl) return;
      const transcription = await transcribeAudio(mediaUrl, process.env.OPENAI_API_KEY ?? "");
      if (!transcription.ok || !transcription.text) {
        console.error("[WHISPER] Transcription failed:", transcription.error);
        return; // متعرفناش نفهم الصوت، متكملش رد فاضي
      }
      messageText = transcription.text;
      console.log(`[WHISPER] Transcribed audio → "${messageText}"`);

      // ── سجّل تكلفة Whisper كـ "توكنز افتراضية" في نفس الـ quota ──────────
      // Whisper بيتحاسب بالدقيقة ($0.006/دقيقة) مش بالتوكنز، فمفيش رقم توكنز
      // حقيقي نسجله. بنحوّل تكلفته لتوكنز GPT-4o-mini "مكافئة" بنفس القيمة
      // المادية تقريبًا، عشان الاستهلاك يدخل في نفس quota العميل ومايفضلش
      // بيستخدم صوت من غير حد.
      if (transcription.durationSeconds) {
        const estimatedTokens = estimateWhisperTokens(transcription.durationSeconds);
        void incrementAITokens(userId, estimatedTokens);
        console.log(`[WHISPER] ~${estimatedTokens} token-equivalent خصمت (${transcription.durationSeconds.toFixed(1)}s)`);
      }
    }

    if (mediaType === MessageType.image) {
      if (!mediaUrl) return;
      imageUrl = mediaUrl;
      if (!messageText.trim() || messageText === "Image") {
        messageText = "العميل بعت صورة، حللها ورد عليه بناءً عليها.";
      }
    }
  }

  const textLower = messageText.toLowerCase().trim();

  // ── 0: Supersede any WAITING Interactive Menu interaction for this contact when customer sends a message ──
  const contactRecord = await prisma.contact.findFirst({
    where: { phone: from, userId },
    select: { id: true, name: true, voiceAgentEnabled: true, textAiEnabled: true, aiStatus: true },
  });

  if (contactRecord?.id) {
    await supersedeWaitingInteractions(contactRecord.id, userId);
  }

  if (contactRecord?.voiceAgentEnabled) {
    // ── Plan guard: token quota (نفس الـ text AI) ─────────────────────────
    const voiceGuard = await checkAITokensLimit(userId);
    if (!voiceGuard.allowed) {
      console.log(`[VOICE-AGENT] Blocked — token limit for ${userId}`);
      return;
    }

    const agentSettings = await prisma.aIAgent.findUnique({
      where: { userId },
      select: {
        elevenLabsEnabled: true, elevenLabsApiKey: true, elevenLabsAgentId: true,
        isEnabled: true, provider: true,
        brandName: true, businessDesc: true, productsInfo: true,
        pricingInfo: true, workingHours: true, tone: true, systemPrompt: true,
        languageMode: true, websiteUrl: true, websiteButtonText: true,
      },
    });

    const voiceApiKey = agentSettings?.elevenLabsApiKey
      ? (isEncrypted(agentSettings.elevenLabsApiKey) ? decryptToken(agentSettings.elevenLabsApiKey) : agentSettings.elevenLabsApiKey)
      : null;

    if (
      agentSettings?.elevenLabsEnabled &&
      agentSettings?.isEnabled &&
      voiceApiKey?.trim() &&
      agentSettings.elevenLabsAgentId?.trim()
    ) {
      // ── Step 1: ولّد الرد النصي عبر Gemini/OpenAI (بيتحسب في التوكن) ──
      const recentMsgs = await prisma.message.findMany({
        where: { contactId: contactRecord.id, userId, type: MessageType.text },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { content: true, direction: true },
      });

      const aiMessages: ConversationMessage[] = recentMsgs
        .reverse()
        .filter(m => m.content)
        .map(m => ({
          role: m.direction === "inbound" ? "user" as const : "assistant" as const,
          content: m.content!,
        }));

      if (!aiMessages.length) aiMessages.push({ role: "user", content: messageText, imageUrl });
      else if (mediaType === MessageType.audio || mediaType === MessageType.image) {
        // الرسالة الحالية مش متخزنة كـ type=text، ضيفها يدوي
        aiMessages.push({ role: "user", content: messageText, imageUrl });
      }

      const aiResult = await getAIReply(
        aiMessages,
        {
          brandName: agentSettings.brandName,
          businessDesc: agentSettings.businessDesc,
          productsInfo: agentSettings.productsInfo,
          pricingInfo: agentSettings.pricingInfo,
          workingHours: agentSettings.workingHours,
          tone: agentSettings.tone,
          systemPrompt: agentSettings.systemPrompt,
          languageMode: agentSettings.languageMode,
          websiteUrl: agentSettings.websiteUrl,
          websiteButtonText: agentSettings.websiteButtonText,
        },
        agentSettings.provider as "gemini" | "openai",
      );

      if (!aiResult.ok || !aiResult.reply?.trim()) {
        console.error("[VOICE-AGENT] AI text generation failed:", aiResult.error);
        return;
      }

      if (aiResult.action === "handoff" && contactRecord) {
        await prisma.contact.update({
          where: { id: contactRecord.id },
          data: {
            aiStatus: "NEEDS_HUMAN",
            handoffReason: aiResult.reason ?? "الـ AI طلب تحويل المحادثة لإنسان",
            handoffAt: new Date(),
          },
        });
        await notifyAiHandoffNeeded(
          userId,
          contactRecord.name ?? from,
          contactRecord.id,
          aiResult.reason ?? null,
          aiResult.priority ?? "normal",
        );
      }

      // سجّل استهلاك التوكن
      if (aiResult.tokensUsed) void incrementAITokens(userId, aiResult.tokensUsed);

      console.log(`[VOICE-AGENT] Text ready (${aiResult.tokensUsed ?? 0} tokens) → converting to audio`);

      // ── Step 2: حوّل النص لصوت عبر ElevenLabs TTS فقط ───────────────────
      const voiceResult = await callVoiceAgent({
        agentId: agentSettings.elevenLabsAgentId,
        apiKey: voiceApiKey,
        textReply: aiResult.reply,
      });

      if (!voiceResult.ok || !voiceResult.audioBuffer) {
        console.error("[VOICE-AGENT] TTS failed:", voiceResult.error);
        return;
      }

      // ── Step 3: ارفع على Cloudinary وابعت Voice Note ─────────────────────
      const audioUrl = await uploadAudioToCloudinary(voiceResult.audioBuffer);
      if (!audioUrl) {
        console.error("[VOICE-AGENT] Cloudinary upload failed");
        return;
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountOwner.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accountOwner.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "audio",
            audio: { link: audioUrl },
          }),
        }
      );

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const whatsappMsgId = metaData?.messages?.[0]?.id as string | undefined;
        const sentAt = new Date(); // نفس القيمة في message.sentAt و contact.lastAiRepliedAt

        await prisma.$transaction([
          prisma.message.create({
            data: {
              userId,
              contactId: contactRecord.id,
              content: aiResult.reply,
              type: MessageType.audio,
              direction: MessageDirection.outbound,
              status: MessageStatus.sent,
              senderType: MessageSenderType.ai,
              whatsappId: whatsappMsgId,
              mediaUrl: audioUrl,
              sentAt,
            },
          }),
          prisma.contact.update({
            where: { id: contactRecord.id },
            data: { lastAiRepliedAt: sentAt },
          }),
        ]);

        console.log(`[VOICE-AGENT] ✅ Audio reply sent to ${from} via ${agentSettings.provider}`);

        // ─── Conversation Nudge (نفس منطق الرد النصي) ───────────────────────
        if (aiResult.expectsReply) {
          await inngest.send({
            name: "agent-conversation.nudge-check",
            data: {
              contactId: contactRecord.id,
              userId,
              triggerMessageAt: sentAt.toISOString(),
            },
          }).catch((e) => console.error("[NUDGE] Failed to schedule nudge-check event:", e));
        }
      } else {
        console.error("[VOICE-AGENT] WhatsApp send failed:", await metaRes.text());
      }

      return; // لا تكمل لـ text AI
    }
  }

  // -- 2: FIRST_MESSAGE — رسالة الترحيب لأول رسالة -------------------------
  // الرسالة الحالية تم حفظها في DB قبل أن تبدأ handleAutomation
  // فإذا كان عدد الرسائل = 1 فهذه أول رسالة من العميل
  const contactForFirst = contactRecord ?? await prisma.contact.findFirst({
    where: { phone: from, userId },
    select: { id: true },
  });

  if (contactForFirst) {
    const msgCount = await prisma.message.count({
      where: { contactId: contactForFirst.id, userId },
    });

    if (msgCount === 1) {
      const welcomeRule = await prisma.automationRule.findFirst({
        where: { userId, triggerType: TriggerType.FIRST_MESSAGE, isEnabled: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, replyType: true, replyContent: true, replyMediaUrl: true, interactiveConfig: true },
      });

      if (welcomeRule) {
        if (welcomeRule.replyType === ReplyType.INTERACTIVE_MENU && welcomeRule.interactiveConfig) {
          console.log(`[BOT] FIRST_MESSAGE (Interactive Menu) → "${welcomeRule.name}" for ${from}`);
          await sendInteractiveMenuReply({
            userId,
            contactId: contactForFirst.id,
            from,
            accountOwner,
            ruleId: welcomeRule.id,
            ruleName: welcomeRule.name,
            interactiveConfig: welcomeRule.interactiveConfig as any,
          });
          return;
        } else if (welcomeRule.replyContent?.trim()) {
          console.log(`[BOT] FIRST_MESSAGE → "${welcomeRule.name}" for ${from}`);
          await sendReply({
            userId, from,
            replyText: welcomeRule.replyContent.trim(),
            replyMediaUrl: welcomeRule.replyMediaUrl ?? undefined,
            accountOwner,
            ruleName: welcomeRule.name,
          });
          return;
        }
      }
    }
  }

  // -- 1: Keyword Bot — بوت الكلمات المفتاحية ---------------------
  const keywordRules = await prisma.automationRule.findMany({
    where: {
      userId,
      isEnabled: true,
      triggerType: TriggerType.KEYWORD,
      replyType: { in: [ReplyType.TEXT, ReplyType.INTERACTIVE_MENU] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, triggerValue: true, replyType: true, replyContent: true, replyMediaUrl: true, humanKeywords: true, interactiveConfig: true },
  });

  // Human takeover — لو الرسالة من العميل فيها كلمة طلب إنسان
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

  // Keyword match — فحص الكلمات
  const matched = keywordRules.find(r =>
    r.triggerValue?.trim() &&
    textLower.includes(r.triggerValue.toLowerCase().trim())
  );

  if (matched) {
    if (matched.replyType === ReplyType.INTERACTIVE_MENU && matched.interactiveConfig) {
      console.log(`[BOT] Keyword matched (Interactive Menu) → "${matched.name}" for "${messageText}"`);
      await sendInteractiveMenuReply({
        userId,
        contactId: contactForFirst?.id ?? contactRecord!.id,
        from,
        accountOwner,
        ruleId: matched.id,
        ruleName: matched.name,
        interactiveConfig: matched.interactiveConfig as any,
      });
      return;
    }

    const replyText = matched.replyContent?.trim();
    if (!replyText) return;
    console.log(`[BOT] Keyword matched → "${matched.name}" for "${messageText}"`);
    await sendReply({ userId, from, replyText: replyText ?? "", replyMediaUrl: matched.replyMediaUrl ?? undefined, accountOwner, ruleName: matched.name });
    return;
  }

  // -- 2: AI Agent — لو مفيش keyword match ---------------------------------
  const agent = await prisma.aIAgent.findUnique({
    where: { userId },
    select: {
      isEnabled: true, provider: true,
      brandName: true, businessDesc: true, productsInfo: true,
      pricingInfo: true, workingHours: true, tone: true,
      systemPrompt: true, pauseMinutes: true,
      languageMode: true, websiteUrl: true, websiteButtonText: true,
    },
  });

  if (!agent?.isEnabled) return;

  // -- 2a: Check if Text AI is specifically disabled for this contact --
  if (contactRecord?.textAiEnabled === false) {
    console.log(`[AI-AGENT] Paused — text AI is disabled for ${from}`);
    return;
  }

  if (contactRecord?.aiStatus && contactRecord.aiStatus !== "AUTO") {
    console.log(`[AI-AGENT] Paused — conversation needs human (status: ${contactRecord.aiStatus})`);
    return;
  }

  // ── Plan guard: AI Token Quota ──
  const aiPlanGuard = await checkAITokensLimit(userId);
  if (!aiPlanGuard.allowed) {
    console.log(`[AI-AGENT] Blocked — token limit reached for ${userId}`);
    return;
  }


  // Pause check — لو الإنسان رد مؤخراً، أوقف AI مؤقت
  const lastManualOutbound = await prisma.messageQueue.findFirst({
    where: { userId, toPhone: from, campaignId: null, status: { in: ["sent", "failed"] } },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  if (lastManualOutbound?.sentAt) {
    const minsSince = (Date.now() - lastManualOutbound.sentAt.getTime()) / 60_000;
    if (minsSince < (agent.pauseMinutes ?? 10)) {
      console.log(`[AI-AGENT] Paused — human replied ${minsSince.toFixed(1)}m ago for ${from}`);
      return;
    }
  }

  let aiMessages: ConversationMessage[] = [{ role: "user", content: messageText, imageUrl }];
  if (contactRecord) {
    const recentMsgs = await prisma.message.findMany({
      where: { contactId: contactRecord.id, userId, type: MessageType.text },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { content: true, direction: true },
    });
    const fromDb = recentMsgs
      .reverse()
      .filter(m => m.content?.trim())
      .map(m => ({
        role: m.direction === MessageDirection.inbound ? "user" as const : "assistant" as const,
        content: m.content!.trim(),
      }));
    if (fromDb.length) {
      aiMessages = fromDb;
      // الرسالة الحالية (صوت متحوّل لنص أو صورة) مش متخزنة كـ type=text في الـ DB،
      // فلازم نضيفها يدوي آخر حاجة في الـ history عشان الموديل ميتجاهلهاش
      if (mediaType === MessageType.audio || mediaType === MessageType.image) {
        aiMessages.push({ role: "user", content: messageText, imageUrl });
      }
    }
  }

  // ── NEW: Retrieve structured knowledge sources ──────────────────────────
  const { getRelevantProducts, getSuggestedProducts } = await import("@/lib/product-search");

  const relevantProducts = await getRelevantProducts(userId, messageText, 5);

  // Policies + Guardrails — fetch all (small data, no retrieval needed)
  const [policies, guardrails, salesSettings, websiteSettings] = await Promise.all([
    prisma.brandPolicy.findMany({
      where: { userId },
      select: { type: true, title: true, content: true },
    }),
    prisma.aIGuardrail.findUnique({
      where: { userId },
      select: {
        noInventPrices: true, noInventProducts: true,
        noMentionCompetitors: true, noSharePersonal: true,
        strictKnowledgeOnly: true, alwaysHandoffComplaints: true,
        responseStyle: true, customRules: true,
      },
    }),
    prisma.salesBehaviorSettings.findUnique({ where: { userId } }),
    prisma.websiteCrawlSettings.findUnique({ where: { userId }, select: { isEnabled: true } }),
  ]);

  let suggestedProducts: import("@/lib/product-search").SuggestedProduct[] = [];
  if (relevantProducts.length > 0 && salesSettings && (salesSettings.suggestAlternatives || salesSettings.suggestUpsell || salesSettings.suggestCrossSell)) {
    const primary = relevantProducts[0];
    const fullPrimary = await prisma.product.findUnique({
      where: { id: primary.id },
      select: { id: true, category: true, price: true, relatedProductIds: true },
    });
    if (fullPrimary) {
      suggestedProducts = await getSuggestedProducts(userId, fullPrimary, salesSettings, Math.min(salesSettings.maxSuggestedProducts, 3));
    }
  }
  const websiteKnowledge = websiteSettings?.isEnabled
    ? await (await import("@/lib/website-search")).getRelevantWebsiteKnowledge(userId, messageText, 3)
    : [];

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
      // ── NEW structured knowledge ──
      relevantProducts: relevantProducts.length > 0 ? relevantProducts : undefined,
      suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
      salesBehavior: salesSettings ? { goal: salesSettings.goal, suggestDiscounts: salesSettings.suggestDiscounts } : undefined,
      websiteKnowledge: websiteKnowledge.length > 0 ? websiteKnowledge : undefined,
      policies: policies.length > 0 ? policies : undefined,
      guardrails: guardrails ?? undefined,
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

  if (result.action === "handoff" && contactRecord) {
    await prisma.contact.update({
      where: { id: contactRecord.id },
      data: {
        aiStatus: "NEEDS_HUMAN",
        handoffReason: result.reason ?? "الـ AI طلب تحويل المحادثة لإنسان",
        handoffAt: new Date(),
      },
    });
    await notifyAiHandoffNeeded(
      userId,
      contactRecord.name ?? from,
      contactRecord.id,
      result.reason ?? null,
      result.priority ?? "normal",
    );
  }

  // ── سجّل استهلاك التوكن ──
  if (result.tokensUsed) {
    void incrementAITokens(userId, result.tokensUsed);
  }

  // ── NEW: Resolve product image for first valid product_id ──────────────
  let productImageUrl: string | undefined;
  if (result.productIds?.length && relevantProducts.length > 0) {
    // Validate: only accept IDs from the retrieved context (security)
    const retrievedIdSet = new Set([
      ...relevantProducts.map(p => p.id),
      ...suggestedProducts.map(p => p.id),
    ]);
    const validIds = result.productIds.filter(id => retrievedIdSet.has(id));

    if (validIds.length > 0) {
      // Fetch first product's image from DB (MVP: single image only)
      const productWithImage = await prisma.product.findFirst({
        where: { id: validIds[0], userId, isActive: true },
        select: { images: true },
      });
      if (productWithImage?.images?.length) {
        productImageUrl = productWithImage.images[0];
      }
    }
  }

  const sendResult = await sendReply({
    userId, from,
    replyText: result.reply,
    replyMediaUrl: productImageUrl,
    accountOwner,
    ruleName: `AI/${agent.provider}`,
    isAI: true,
  });

  // ─── Conversation Nudge: لو الرد لسه بيستنى تفاعل من العميل، جدول متابعة ───
  // الـ AI نفسه حدد expectsReply وقت توليد الرد (شايف السياق كامل) — مش
  // بمنطق خارجي بيدور على كلمات مفتاحية. لو المحادثة اتقفلت طبيعياً
  // (شراء تم، استفسار اتحل) الـ AI بيرجع expectsReply=false ومفيش nudge.
  //
  // بنستخدم بالظبط نفس sentAt اللي اتكتب في contact.lastAiRepliedAt (رجعها
  // sendReply) كـ "بصمة" — لو رد AI تاني حصل بعد كده، lastAiRepliedAt هيبقى
  // مختلف عن القيمة دي وقت التحقق، والـ Inngest function هتلاحظ الفرق
  // ومتبعتش nudge قديم على رد اتجاوز بالفعل.
  if (result.expectsReply && sendResult?.contactId) {
    await inngest.send({
      name: "agent-conversation.nudge-check",
      data: {
        contactId: sendResult.contactId,
        userId,
        triggerMessageAt: sendResult.sentAt.toISOString(),
      },
    }).catch((e) => console.error("[NUDGE] Failed to schedule nudge-check event:", e));
  }
}

// -----------------------------------------------------------------------------
// Helper: ????? ???? ??? Meta API ????? ?? ??? DB
// -----------------------------------------------------------------------------
async function sendReply(ctx: {
  userId: string;
  from: string;
  replyText: string;
  replyMediaUrl?: string;
  accountOwner: { accessToken: string; phoneNumberId: string };
  ruleName: string;
  isAI?: boolean;   // true = AI Agent أو Voice Agent
}) {
  const { userId, from, replyText, replyMediaUrl, accountOwner, ruleName, isAI = false } = ctx;
  const senderType = isAI ? MessageSenderType.ai : MessageSenderType.bot;
  const apiBase = `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountOwner.phoneNumberId}/messages`;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accountOwner.accessToken}`,
  };

  const contact = await prisma.contact.findFirst({
    where: { phone: from, userId },
    select: { id: true },
  });
  if (!contact) return;

  // ── إرسال الصورة أولاً (لو موجودة) ──────────────────────────────────────
  if (replyMediaUrl?.trim()) {
    const imgRes = await fetch(apiBase, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "image",
        image: {
          link: replyMediaUrl.trim(),
          caption: replyText || undefined,   // النص يظهر كـ caption تحت الصورة
        },
      }),
    });

    if (!imgRes.ok) {
      const err = await imgRes.text();
      console.error(`[AUTOMATION] Image send failed for ${from}:`, err);
      // fallback: أرسل النص فقط
    } else {
      const imgData = await imgRes.json();
      const whatsappMsgId = imgData?.messages?.[0]?.id as string | undefined;
      await prisma.message.create({
        data: {
          userId,
          contactId: contact.id,
          content: replyText || null,
          mediaUrl: replyMediaUrl,
          type: MessageType.image,
          direction: MessageDirection.outbound,
          status: MessageStatus.sent,
          whatsappId: whatsappMsgId,
          sentAt: new Date(),
        },
      });
      console.log(`[AUTOMATION] Image sent to ${from} via "${ruleName}"`);
      // لو في caption (النص) بعت مع الصورة — مش محتاج رسالة نصية تانية
      return;
    }
  }

  // ── إرسال نصي فقط ────────────────────────────────────────────────────────
  if (!replyText?.trim()) return;

  const metaRes = await fetch(apiBase, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: from,
      type: "text",
      text: { body: replyText },
    }),
  });

  if (!metaRes.ok) {
    const err = await metaRes.text();
    console.error(`[AUTOMATION] Meta send failed for ${from}:`, err);
    return;
  }

  const metaData = await metaRes.json();
  const whatsappMsgId = metaData?.messages?.[0]?.id as string | undefined;
  const sentAt = new Date(); // ← نفس القيمة بتتحط في message.sentAt وفي contact.lastAiRepliedAt
  //   عشان الـ caller يقدر يستخدمها كـ "بصمة" دقيقة للـ nudge scheduling

  await prisma.$transaction([
    prisma.message.create({
      data: {
        userId,
        contactId: contact.id,
        content: replyText,
        type: MessageType.text,
        direction: MessageDirection.outbound,
        status: MessageStatus.sent,
        senderType,
        whatsappId: whatsappMsgId,
        sentAt,
      },
    }),
    // تحديث lastAiRepliedAt لو الرد من AI أو bot
    ...(isAI ? [
      prisma.contact.update({
        where: { id: contact.id },
        data: { lastAiRepliedAt: sentAt },
      }),
    ] : []),
  ]);

  console.log(`[AUTOMATION] Done — replied to ${from} via "${ruleName}" (senderType=${senderType})`);
  return { contactId: contact.id, sentAt };
}

// -----------------------------------------------------------------------------
// Helper: إرسال قائمة تفاعلية عبر WhatsApp Cloud API
// -----------------------------------------------------------------------------
async function sendInteractiveMenuReply(ctx: {
  userId: string;
  contactId: string;
  from: string;
  accountOwner: { id?: string; accessToken: string; phoneNumberId: string };
  ruleId: string;
  ruleName: string;
  interactiveConfig: {
    body: string;
    footer?: string;
    buttons: Array<{ buttonId: string; text: string; nextStepId?: string | null }>;
  };
}) {
  const { userId, contactId, from, accountOwner, ruleId, ruleName, interactiveConfig } = ctx;
  const { sendWhatsAppMessage } = await import("@/lib/whatsapp-api");

  if (!interactiveConfig.buttons?.length || interactiveConfig.buttons.length > 3) {
    console.error(`[INTERACTIVE-MENU] Invalid button count (${interactiveConfig.buttons?.length}) for rule "${ruleName}"`);
    return;
  }

  let waAccountId = accountOwner.id;
  if (!waAccountId) {
    const wa = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId: accountOwner.phoneNumberId },
      select: { id: true },
    });
    waAccountId = wa?.id || "";
  }

  const buttons = interactiveConfig.buttons.slice(0, 3).map(b => ({
    id: b.buttonId,
    title: b.text.slice(0, 20),
  }));

  const res = await sendWhatsAppMessage({
    userId,
    toPhone: from,
    phoneNumberId: accountOwner.phoneNumberId,
    accessToken: accountOwner.accessToken,
    messageType: "interactive_buttons",
    templateName: null,
    templateLang: "ar",
    templateVars: null,
    content: interactiveConfig.body,
    interactive: {
      body: interactiveConfig.body,
      footer: interactiveConfig.footer || undefined,
      buttons,
    },
  });

  if (!res.ok) {
    console.error(`[INTERACTIVE-MENU] Send failed for ${from} via "${ruleName}":`, res.error);
    return;
  }

  const sentAt = new Date();

  // إنشاء سجل الرسالة
  const msgRecord = await prisma.message.create({
    data: {
      userId,
      contactId,
      content: interactiveConfig.body,
      type: MessageType.text,
      direction: MessageDirection.outbound,
      status: MessageStatus.sent,
      senderType: MessageSenderType.bot,
      whatsappId: res.whatsappMsgId ?? null,
      sentAt,
    },
  });

  // إنهاء أي تفاعل سابق نشط كـ SUPERSEDED
  await prisma.automationInteraction.updateMany({
    where: { contactId, userId, state: "WAITING" },
    data: { state: "SUPERSEDED" },
  }).catch(() => { });

  // حفظ التفاعل الجديد مع نسخة snapshot من الأزرار
  if (waAccountId) {
    await prisma.automationInteraction.create({
      data: {
        userId,
        contactId,
        whatsappAccountId: waAccountId,
        phoneNumberId: accountOwner.phoneNumberId,
        automationRuleId: ruleId,
        outboundMessageId: msgRecord.id,
        buttonSnapshot: interactiveConfig.buttons as any,
        state: "WAITING",
      },
    });
  }

  console.log(`[INTERACTIVE-MENU] Sent interactive menu "${ruleName}" to ${from}`);
}

// -----------------------------------------------------------------------------
// Helper: تنفيذ الخطوة التالية بعد ضغط الزر مع حماية ضد الـ infinite loops
// -----------------------------------------------------------------------------
async function executeAutomationStep(ctx: {
  userId: string;
  from: string;
  contactId: string;
  accountOwner: { id?: string; accessToken: string; phoneNumberId: string };
  stepId: string;
  hops?: number;
}): Promise<void> {
  const { userId, from, contactId, accountOwner, stepId, hops = 1 } = ctx;

  if (isHopLimitExceeded(hops)) {
    console.warn(
      `[AUTOMATION] Max hops limit (${INTERACTIVE_MENU_MAX_HOPS}) reached for ${from}. Stopping execution to prevent circular loops.`,
    );
    try {
      const ruleName = await findAutomationRuleName(userId, stepId);
      await notifyAutomationLoopStopped(userId, ruleName, contactId, hops);
    } catch (err) {
      console.error("[AUTOMATION] Failed to send loop-stopped notification:", err);
    }
    return;
  }

  const rule = await findEnabledAutomationStep(userId, stepId);

  if (!rule) {
    console.log(`[AUTOMATION] Step ${stepId} not found, disabled, or unauthorized for user ${userId}. Safe finish.`);
    throw new Error(`Step ${stepId} not found or disabled`);
  }

  console.log(`[AUTOMATION] Executing step "${rule.name}" (type: ${rule.replyType}, hop: ${hops}) for ${from}`);

  if (rule.replyType === ReplyType.TEXT && rule.replyContent) {
    await sendReply({
      userId,
      from,
      replyText: rule.replyContent.trim(),
      replyMediaUrl: rule.replyMediaUrl ?? undefined,
      accountOwner,
      ruleName: rule.name,
    });
  } else if (rule.replyType === ReplyType.INTERACTIVE_MENU && rule.interactiveConfig) {
    await sendInteractiveMenuReply({
      userId,
      contactId,
      from,
      accountOwner,
      ruleId: rule.id,
      ruleName: rule.name,
      interactiveConfig: rule.interactiveConfig as any,
    });
  } else if (rule.replyType === ReplyType.TEMPLATE && rule.templateId) {
    const template = await prisma.template.findFirst({
      where: { id: rule.templateId, userId },
      select: { name: true, language: true },
    });
    if (template) {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp-api");
      const res = await sendWhatsAppMessage({
        userId,
        toPhone: from,
        phoneNumberId: accountOwner.phoneNumberId,
        accessToken: accountOwner.accessToken,
        messageType: "template",
        templateName: template.name,
        templateLang: template.language || "ar",
        templateVars: null,
        content: null,
      });
      if (res.ok) {
        await prisma.message.create({
          data: {
            userId,
            contactId,
            content: `[Template: ${template.name}]`,
            type: MessageType.template,
            direction: MessageDirection.outbound,
            status: MessageStatus.sent,
            senderType: MessageSenderType.bot,
            whatsappId: res.whatsappMsgId ?? null,
            sentAt: new Date(),
          },
        });
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Helper: ????? ????? ?????? ??? Enums ????? ????????
// -----------------------------------------------------------------------------
function mapStatus(waStatus: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    sent: MessageStatus.sent,
    delivered: MessageStatus.delivered,
    read: MessageStatus.read,
    failed: MessageStatus.failed,
  };
  return map[waStatus] || MessageStatus.pending;
}