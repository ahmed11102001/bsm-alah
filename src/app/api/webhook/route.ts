import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType, TriggerType, ReplyType } from "@prisma/client";
import { notifyNewMessage } from "@/lib/notifications";
import { getSmartReply } from "@/lib/gemini";

// -------------------------------------------------------------------
// HELPER: التحقق من توقيع Meta (HMAC-SHA256)
// Meta بتبعت header: x-hub-signature-256 = "sha256=<hex>"
// لازم نتحقق منه قبل أي معالجة لمنع الطلبات المزيفة
// -------------------------------------------------------------------
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

  // timingSafeEqual يمنع Timing Attacks
  if (expected.length !== received.length) {
    return { valid: false, rawBody };
  }

  return { valid: timingSafeEqual(expected, received), rawBody };
}

// -------------------------------------------------------------------
// GET: Webhook Verification (للتفعيل الأول مع ميتا)
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
// POST: Incoming Webhook Events (معالجة الرسائل والحالات)
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // ── Step 1: التحقق من التوقيع أولاً قبل أي معالجة ───────────────
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
      // نرجع 200 عشان Meta ما تعيدش المحاولة
      return NextResponse.json({ status: "ignored" });
    }

    const userId = accountOwner.userId;

    // ── Step 2: تحديثات الحالة (Delivered / Read / Failed) ──────────
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

    // ── Step 3: الرسائل الواردة (Inbound Messages) ──────────────────
    if (value?.messages?.length) {
      const msg  = value.messages[0];
      const from = msg.from;

      // ── معالجة الـ Reaction ──────────────────────────────────────────────
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

      // منع التكرار بناءً على معرف واتساب
      const existing = await prisma.message.findFirst({
        where: { whatsappId: msg.id, userId },
      });

      if (existing) {
        return NextResponse.json({ status: "duplicate_ignored" });
      }

      // تحديد نوع المحتوى
      let type: MessageType       = MessageType.text;
      let content                 = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "image") {
        type     = MessageType.image;
        content  = msg.image?.caption || "📷 Image";
        mediaUrl = msg.image?.id || null;
      } else if (msg.type === "audio") {
        type     = MessageType.audio;
        content  = "🎵 Audio message";
        mediaUrl = msg.audio?.id || null;
      }

      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where:  { phone_userId: { phone: from, userId } },
          update: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
          create: { phone: from, userId, lastMessageAt: new Date(), unreadCount: 1 },
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

      // إشعار رسالة واردة جديدة
      await notifyNewMessage(userId, from);

      // ── Step 4: تشغيل الأتمتة (بدون await — Meta لازم تاخد 200 فوري) ──
      if (type === MessageType.text && content.trim()) {
        handleAutomation({ userId, from, messageText: content, accountOwner }).catch(
          (err) => console.error("[AUTOMATION] Unhandled error:", err)
        );
      }
    }

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("[WEBHOOK] Processing error:", error);
    // نرجع 200 دايماً عشان Meta ما تعيدش المحاولة وتعمل flood
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

// -------------------------------------------------------------------
// AUTOMATION: منطق الأتمتة — يُشغَّل بعد حفظ الرسالة وإرسال 200 لـ Meta
// -------------------------------------------------------------------
async function handleAutomation(ctx: {
  userId:       string;
  from:         string;
  messageText:  string;
  accountOwner: { accessToken: string; phoneNumberId: string };
}) {
  const { userId, from, messageText, accountOwner } = ctx;
  const textLower = messageText.toLowerCase().trim();

  // جيب كل القواعد المفعّلة مرتبة من الأقدم للأحدث
  const rules = await prisma.automationRule.findMany({
    where:   { userId, isEnabled: true },
    orderBy: { createdAt: "asc" },
  });

  if (!rules.length) return;

  // جيب بيانات البراند الخاصة بالمستخدم
  const owner = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      brandName: true, businessDesc: true, productsInfo: true,
      pricingInfo: true, workingHours: true, aiTone: true,
    },
  });
  if (!owner) return;

  // ── A: Human keywords — أي قاعدة فيها كلمة تحويل بشري ──────────
  const humanTriggered = rules.some(r =>
    r.humanKeywords.some(kw => textLower.includes(kw.toLowerCase()))
  );
  if (humanTriggered) {
    // بعت إشعار للمالك فقط بدون رد تلقائي
    await notifyNewMessage(userId, from);
    console.log(`[AUTOMATION] Human takeover triggered for ${from}`);
    return;
  }

  // ── B: pauseOnReply — لو البشري ردّ يدوياً خلال آخر 24 ساعة ────
  const shouldPause = rules.some(r => r.pauseOnReply);
  if (shouldPause) {
    const lastManualOutbound = await prisma.message.findFirst({
      where: {
        userId,
        contact:    { phone: from },
        direction:  MessageDirection.outbound,
        campaignId: null, // مش رسالة حملة = رد يدوي
      },
      orderBy: { createdAt: "desc" },
      select:  { createdAt: true },
    });
    if (lastManualOutbound) {
      const hoursSince = (Date.now() - lastManualOutbound.createdAt.getTime()) / 3_600_000;
      if (hoursSince < 24) {
        console.log(`[AUTOMATION] Paused — human replied recently for ${from}`);
        return;
      }
    }
  }

  // ── C: هل ده أول رسالة من الجهة دي؟ ────────────────────────────
  const msgCount = await prisma.message.count({
    where: { userId, contact: { phone: from } },
  });
  const isFirstMessage = msgCount <= 1; // الرسالة الحالية اتحفظت للتو

  // ── D: ابحث عن القاعدة المناسبة بالأولوية ───────────────────────
  let matchedRule: (typeof rules)[0] | null = null;

  // 1. KEYWORD — اجمع كل القواعد المطابقة ثم اختَر حسب أولوية نوع الرد
  {
    const keywordRules = rules.filter(r =>
      r.triggerType === TriggerType.KEYWORD &&
      r.triggerValue?.trim() &&
      textLower.includes(r.triggerValue.toLowerCase().trim())
    );

    matchedRule =
      keywordRules.find(r => r.replyType === ReplyType.AI) ||
      keywordRules.find(r => r.replyType === ReplyType.TEMPLATE) ||
      keywordRules.find(r => r.replyType === ReplyType.TEXT) ||
      null;

    console.log("[AUTOMATION] Selected rule:", {
      name: matchedRule?.name,
      type: matchedRule?.replyType,
    });

    if (matchedRule) {
      console.log(`[AUTOMATION] Keyword matched rule "${matchedRule.name}" (replyType=${matchedRule.replyType}) for "${messageText}"`);
    }
  }

  // 2. FIRST_MESSAGE (fallback بعد keyword)
  if (!matchedRule && isFirstMessage) {
    matchedRule = rules.find(r => r.triggerType === TriggerType.FIRST_MESSAGE) ?? null;
  }

  // 3. AI catch-all — قاعدة نوعها AI بدون keyword مُحدد (تشتغل على أي رسالة)
  // فقط لو مفيش keyword أو FIRST_MESSAGE rule اتطابق
  if (!matchedRule) {
    matchedRule = rules.find(r =>
      r.replyType === ReplyType.AI &&
      r.triggerType !== TriggerType.KEYWORD // مش keyword rule — catch-all فعلي
    ) ?? null;

    if (matchedRule) {
      console.log(`[AUTOMATION] AI catch-all rule "${matchedRule.name}" triggered for "${messageText}"`);
    }
  }

  if (!matchedRule) {
    console.log(`[AUTOMATION] No matching rule for "${messageText}" from ${from}`);
    return;
  }

  // ── E: جهّز نص الرد ─────────────────────────────────────────────
  let replyText: string | null = null;

  if (matchedRule.replyType === ReplyType.TEXT) {
    replyText = matchedRule.replyContent;

  } else if (matchedRule.replyType === ReplyType.AI) {
    // ── Bug fix: businessDesc مش شرط لو القاعدة نفسها عندها extraInstructions ──
    const businessContext = owner.businessDesc?.trim() || owner.brandName?.trim() || "";

    if (!businessContext && !matchedRule.extraInstructions?.trim()) {
      console.warn(`[AUTOMATION] AI rule "${matchedRule.name}" skipped — no brand context or instructions set`);
      return;
    }

    const geminiResult = await getSmartReply(messageText, {
      brandName:         owner.brandName,
      businessDesc:      businessContext || "مساعد عام",
      productsInfo:      owner.productsInfo,
      pricingInfo:       owner.pricingInfo,
      workingHours:      owner.workingHours,
      aiTone:            owner.aiTone ?? "friendly",
      extraInstructions: matchedRule.extraInstructions,
    });

    if (!geminiResult.ok) {
      console.error(`[AUTOMATION] Gemini error for rule "${matchedRule.name}":`, geminiResult.error);
      return;
    }

    if (geminiResult.offTopic) {
      console.log(`[AUTOMATION] Gemini marked off-topic for "${messageText}" — no reply sent`);
      return;
    }

    replyText = geminiResult.reply ?? null;

  } else if (matchedRule.replyType === ReplyType.TEMPLATE) {
    console.log(`[AUTOMATION] Template reply not yet implemented — rule: ${matchedRule.id}`);
    return;
  }

  if (!replyText?.trim()) return;

  // ── F: ابعت الرد عبر Meta API مباشرة ────────────────────────────
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${accountOwner.phoneNumberId}/messages`,
    {
      method: "POST",
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

  const metaData = await metaRes.json();
  const whatsappMsgId: string | undefined = metaData?.messages?.[0]?.id;

  // ── G: احفظ الرد في الـ DB ───────────────────────────────────────
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

  console.log(`[AUTOMATION] ✓ Replied to ${from} via rule "${matchedRule.name}"`);
}

// -------------------------------------------------------------------
// HELPER: تحويل حالات واتساب إلى Enums قاعدة البيانات
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
