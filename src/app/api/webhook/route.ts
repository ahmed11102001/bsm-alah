import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "bsm_alah_2026";

// -------------------------------------------------------------------
// GET: Webhook Verification (للتفعيل الأول مع ميتا)
// -------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// -------------------------------------------------------------------
// POST: Incoming Webhook Events (معالجة الرسائل والحالات)
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // طباعة الـ Body بالكامل للتشخيص في الـ Logs
    console.log("📩 Incoming Webhook Payload:", JSON.stringify(body, null, 2));

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid object" }, { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // استخراج المعرفات (WABA ID من الـ entry و Phone ID من الـ metadata)
    const wabaIdFromMeta = entry?.id;
    const phoneIdFromMeta = value?.metadata?.phone_number_id;

    // البحث عن المستخدم (دعم البحث بكلا المعرفين لضمان عمل الـ Sample)
    const accountOwner = await prisma.whatsAppAccount.findFirst({
      where: {
        OR: [
          { wabaId: wabaIdFromMeta },
          { phoneNumberId: phoneIdFromMeta }
        ]
      },
    });

    if (!accountOwner) {
      console.log("⚠️ No account owner found in DB for ID:", wabaIdFromMeta || phoneIdFromMeta);
      return NextResponse.json({ status: "ignored" });
    }

    const userId = accountOwner.userId;

    // 1. معالجة تحديثات الحالة (Delivered / Read / Failed)
    if (value?.statuses?.length) {
      const status = value.statuses[0];
      await prisma.message.updateMany({
        where: {
          whatsappId: status.id,
          userId,
        },
        data: {
          status: mapStatus(status.status),
          ...(status.status === "delivered" && { deliveredAt: new Date() }),
          ...(status.status === "read" && { readAt: new Date() }),
        },
      });
      console.log(`📊 Status updated to ${status.status} for message: ${status.id}`);
    }

    // 2. معالجة الرسائل الواردة (Inbound Messages)
    if (value?.messages?.length) {
      const msg = value.messages[0];
      const from = msg.from;

      // منع التكرار بناءً على معرف واتساب
      const existing = await prisma.message.findFirst({
        where: { whatsappId: msg.id, userId },
      });

      if (existing) {
        return NextResponse.json({ status: "duplicate_ignored" });
      }

      // تحديد نوع المحتوى
      let type: MessageType = MessageType.text;
      let content = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "image") {
        type = MessageType.image;
        content = msg.image?.caption || "📷 Image";
        mediaUrl = msg.image?.id || null;
      } else if (msg.type === "audio") {
        type = MessageType.audio;
        content = "🎵 Audio message";
        mediaUrl = msg.audio?.id || null;
      }

      // تنفيذ المعاملة (Transaction) لضمان سلامة البيانات
      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where: { phone_userId: { phone: from, userId } },
          update: {
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
          },
          create: {
            phone: from,
            userId,
            lastMessageAt: new Date(),
            unreadCount: 1,
          },
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
      });

      console.log("✅ Message saved to Neon successfully");
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

// -------------------------------------------------------------------
// HELPER: تحويل حالات واتساب إلى Enums قاعدة البيانات
// -------------------------------------------------------------------
function mapStatus(waStatus: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    sent: MessageStatus.sent,
    delivered: MessageStatus.delivered,
    read: MessageStatus.read,
    failed: MessageStatus.failed,
  };
  return map[waStatus] || MessageStatus.pending;
}