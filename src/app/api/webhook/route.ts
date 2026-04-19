import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ✅ الـ Token اللي ثبتناه في Vercel
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
// 📩 2. استقبال البيانات (POST) - قلب الـ CRM
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // التأكد أن الإشعار من واتساب حسابات البيزنس
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const wabaId = entry?.id; // 🆔 المعرف الفريد لحساب العميل (WABA ID)
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // 🔍 البحث عن العميل (User) صاحب هذا الـ WABA ID في قاعدة البيانات
      const accountOwner = await prisma.whatsAppAccount.findFirst({
        where: { wabaId: wabaId },
        include: { user: true }
      });

      if (!accountOwner) {
        console.warn(`⚠️ إشعار من WABA ID غير مسجل لدينا: ${wabaId}`);
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }

      // --- أ: تحديث حالات الرسائل (Sent, Delivered, Read) ---
      if (value?.statuses) {
        const statusData = value.statuses[0];
        const whatsappMsgId = statusData.id;
        const newStatus = statusData.status; // مثلاً: 'delivered' أو 'read'

        await prisma.message.updateMany({
          where: { 
            whatsappId: whatsappMsgId,
            userId: accountOwner.userId 
          },
          data: { 
            status: mapStatus(newStatus),
            // تحديث التوقيتات بناءً على الحالة
            ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
            ...(newStatus === 'read' ? { readAt: new Date() } : {})
          }
        });

        // تحديث إحصائيات الحملة لو الرسالة تابعة لحملة
        // هنا ممكن تضيف Logic لتحديث الـ Campaign counts
      }

      // --- ب: استقبال رسائل جديدة (ردود العملاء) ---
      if (value?.messages) {
        const msg = value.messages[0];

        const contact = await prisma.contact.upsert({
          where: { phone_userId: { phone: msg.from, userId: accountOwner.userId } },
          create: { phone: msg.from, userId: accountOwner.userId },
          update: {}
        });
        
        // تسجيل الرسالة الواردة في قاعدة البيانات
        await prisma.message.create({
          data: {
            userId: accountOwner.userId,
            contactId: contact.id,
            content: msg.text?.body || "رسالة وسائط",
            type: "text", // أو حسب النوع
            direction: "inbound",
            status: "read"
          }
        });
      }

      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ error: "Not a WABA object" }, { status: 404 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    // نرد بـ 200 دائماً لميتا حتى في الخطأ عشان ميتعطلش الويب هوك عندهم
    return NextResponse.json({ error: "Internal Error" }, { status: 200 });
  }
}

// دالة مساعدة لتحويل حالات واتساب لحالات الـ Enum عندك في بريسما
function mapStatus(waStatus: string): any {
  const map: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };
  return map[waStatus] || "pending";
}