import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";

// ✅ الـ Token الذي ثبتناه في Vercel
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "bsm_alah_2026";

// -------------------------------------------------------------------
// 🌐 1. التحقق من الرابط (GET) - لميتا فقط
// -------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook Verified Successfully!");
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// -------------------------------------------------------------------
// 📩 2. استقبال البيانات (POST) - معالجة الرسائل والصور
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const wabaId = entry?.id;
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // 🔍 البحث عن مالك الحساب باستخدام WABA ID
      const accountOwner = await prisma.whatsAppAccount.findFirst({
        where: { wabaId: wabaId },
      });

      if (!accountOwner) {
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }

      const userId = accountOwner.userId;

      // --- أ: تحديث حالات الرسائل (Delivered, Read) ---
      if (value?.statuses) {
        const statusData = value.statuses[0];
        const whatsappMsgId = statusData.id;
        const newStatus = statusData.status;

        await prisma.message.updateMany({
          where: { whatsappId: whatsappMsgId, userId },
          data: { 
            status: mapStatus(newStatus),
            ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
            ...(newStatus === 'read' ? { readAt: new Date() } : {})
          }
        });
      }

      // --- ب: استقبال الرسائل الجديدة (نصوص وصور) ---
      if (value?.messages) {
        const msg = value.messages[0];
        const from = msg.from; 
        
        // 🚀 التعديل هنا: تحديد النوع كـ MessageType ليتوافق مع Enum
        let messageType: MessageType = MessageType.text;
        let content = msg.text?.body || "";
        let mediaUrl = null;

        // دعم استقبال الصور
        if (msg.type === "image") {
          messageType = MessageType.image;
          content = msg.image?.caption || "📷 صورة";
          mediaUrl = msg.image?.id; 
        }

        // تحديث جهة الاتصال لضمان ظهورها في الشات فوراً
        const contact = await prisma.contact.upsert({
          where: { phone_userId: { phone: from, userId } },
          create: { 
            phone: from, 
            userId,
            lastMessageAt: new Date(),
            unreadCount: 1 
          },
          update: {
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 }
          }
        });
        
        // تسجيل الرسالة الواردة (Inbound)
        await prisma.message.create({
          data: {
            userId,
            contactId: contact.id,
            content,
            type: messageType,
            direction: MessageDirection.inbound,
            status: MessageStatus.delivered,
            whatsappId: msg.id,
            mediaUrl: mediaUrl
          }
        });
      }

      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ error: "Not a WABA object" }, { status: 404 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 200 });
  }
}

function mapStatus(waStatus: string): MessageStatus {
  const map: Record<string, MessageStatus> = {
    sent: MessageStatus.sent,
    delivered: MessageStatus.delivered,
    read: MessageStatus.read,
    failed: MessageStatus.failed,
  };
  return map[waStatus] || MessageStatus.pending;
}