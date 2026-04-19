import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageDirection, MessageStatus, MessageType } from "@prisma/client";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "bsm_alah_2026";

// -------------------------------------------------------------------
// GET: Webhook Verification
// -------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// -------------------------------------------------------------------
// POST: Incoming Webhook Events
// -------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Incoming webhook:", JSON.stringify(body, null, 2));

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid object" }, { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const wabaId = entry?.id;

    if (!wabaId) {
      console.log("⚠️ Missing WABA ID");
      return NextResponse.json({ status: "ignored" });
    }

    const accountOwner = await prisma.whatsAppAccount.findFirst({
      where: { wabaId },
    });

    if (!accountOwner) {
      console.log("⚠️ No account owner found for WABA:", wabaId);
      return NextResponse.json({ status: "ignored" });
    }

    const userId = accountOwner.userId;

    // -------------------------------------------------------------------
    // 1. STATUS UPDATES (delivered/read)
    // -------------------------------------------------------------------
    if (value?.statuses?.length) {
      const status = value.statuses[0];

      console.log("📊 Status update:", status);

      await prisma.message.updateMany({
        where: {
          whatsappId: status.id,
          userId,
        },
        data: {
          status: mapStatus(status.status),
          ...(status.status === "delivered" && {
            deliveredAt: new Date(),
          }),
          ...(status.status === "read" && {
            readAt: new Date(),
          }),
        },
      });
    }

    // -------------------------------------------------------------------
    // 2. INCOMING MESSAGES
    // -------------------------------------------------------------------
    if (value?.messages?.length) {
      const msg = value.messages[0];
      const from = msg.from;

      console.log("📨 Incoming message from:", from);

      // ❗ IDENTITY CHECK (prevent duplicates)
      const existing = await prisma.message.findFirst({
        where: {
          whatsappId: msg.id,
          userId,
        },
      });

      if (existing) {
        console.log("⚠️ Duplicate message ignored:", msg.id);
        return NextResponse.json({ status: "duplicate_ignored" });
      }

      let type: MessageType = MessageType.text;
      let content = msg.text?.body || "";
      let mediaUrl: string | null = null;

      if (msg.type === "image") {
        type = MessageType.image;
        content = msg.image?.caption || "📷 Image";
        mediaUrl = msg.image?.id || null;
      }

      // -------------------------------------------------------------------
      // TRANSACTION: contact + message + unreadCount safe update
      // -------------------------------------------------------------------
      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.upsert({
          where: {
            phone_userId: {
              phone: from,
              userId,
            },
          },
          create: {
            phone: from,
            userId,
            lastMessageAt: new Date(),
            unreadCount: 1,
          },
          update: {
            lastMessageAt: new Date(),
            unreadCount: {
              increment: 1,
            },
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

      console.log("✅ Message saved successfully");
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}

// -------------------------------------------------------------------
// STATUS MAPPING
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