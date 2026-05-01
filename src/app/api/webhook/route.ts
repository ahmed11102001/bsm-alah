import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";

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
    }

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("[WEBHOOK] Processing error:", error);
    // نرجع 200 دايماً عشان Meta ما تعيدش المحاولة وتعمل flood
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
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