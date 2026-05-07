// src/app/api/easy-orders/webhook/route.ts
// â”€â”€â”€ Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø£ÙˆØ±Ø¯Ø±Ø§Øª EasyOrder ÙˆØ¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„Ø¹Ù…ÙŠÙ„ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { normalizePhone } from "@/lib/phone";

// â”€â”€â”€ ØªÙˆÙ„ÙŠØ¯/Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† token Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø¨Ù†Ø¹Ù…Ù„ HMAC(userId, NEXTAUTH_SECRET) â€” Ø¨Ø¯ÙˆÙ† Ù…Ø§ Ù†Ø­ØªØ§Ø¬ field Ø¬Ø¯ÙŠØ¯ ÙÙŠ Ø§Ù„Ù€ DB
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateEasyOrderWebhookUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(userId);
  return `${base}/api/easy-orders/webhook?uid=${userId}&token=${token}`;
}

// â”€â”€â”€ GET â€” Ù„Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù€ endpoint (Ø¨Ø¹Ø¶ Ø§Ù„Ù…Ù†ØµØ§Øª Ø¨ØªØ¹Ù…Ù„ GET verification) â”€â”€â”€â”€â”€â”€â”€
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", service: "easy-orders Webhook" });
}

// â”€â”€â”€ POST â€” Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø§Ù„Ø£ÙˆØ±Ø¯Ø± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    // â”€â”€ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù€ token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[EASYORDER] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // â”€â”€ Parse Ø§Ù„Ù€ body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[EASY-ORDER] Received payload:", JSON.stringify(payload).slice(0, 300));

    // â”€â”€ Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£ÙˆØ±Ø¯Ø± â€” Ø¨ÙŠØ¯Ø¹Ù… ØµÙŠØº Ù…Ø®ØªÙ„ÙØ© Ù„Ù€ EasyOrder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const order = payload?.order ?? payload;

    const phone: string =
      order?.phone                   ??
      order?.customer_phone          ??
      order?.client_phone            ??
      order?.billing_phone           ??
      order?.customer?.phone         ??
      order?.billing_address?.phone  ??
      "";

    const name: string =
      order?.name                    ??
      order?.customer_name           ??
      order?.client_name             ??
      order?.customer?.name          ??
      order?.customer?.first_name    ??
      "Ø§Ù„Ø¹Ù…ÙŠÙ„";

    const orderNumber: string =
      String(order?.order_number ?? order?.id ?? order?.order_id ?? "");

    const total: string =
      String(order?.total ?? order?.total_price ?? order?.amount ?? "");

    const status: string =
      order?.status ?? order?.order_status ?? "Ø¬Ø¯ÙŠØ¯";

    if (!phone) {
      console.warn("[EASYORDER] No phone number found in payload");
      return NextResponse.json({ status: "ignored", reason: "no_phone" });
    }

    // ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø±Ù‚Ù… â€” Ø´ÙŠÙ„ ÙƒÙ„ Ø­Ø§Ø¬Ø© ØºÙŠØ± Ø±Ù‚Ù…
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      console.warn("[EASY-ORDER] Invalid phone:", phone);
      return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
    }

    // â”€â”€ Ø¬ÙŠØ¨ Ø­Ø³Ø§Ø¨ ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        whatsappAccount: {
          select: { accessToken: true, phoneNumberId: true },
        },
      },
    });

    if (!user?.whatsappAccount) {
      console.warn("[EASY-ORDER] No WhatsApp account for user:", userId);
      return NextResponse.json({ status: "ignored", reason: "no_whatsapp" });
    }

    // â”€â”€ Upsert Ø§Ù„Ù€ contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: name !== "Ø§Ù„Ø¹Ù…ÙŠÙ„" ? name : undefined },
      create: { phone: cleanPhone, userId, name },
    });

    // â”€â”€ Ø§Ø¨Ø¹Øª Inngest event Ø¹Ø´Ø§Ù† ÙŠØ¨Ø¹Øª Ø§Ù„Ø±Ø³Ø§Ù„Ø© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await inngest.send({
      name: "easyorder/order.received",
      data: {
        userId,
        contactId: contact.id,
        phone:      cleanPhone,
        name,
        orderNumber,
        total,
        status,
      },
    });

    console.log(`[EASYORDER] âœ“ Order #${orderNumber} queued for WhatsApp to ${cleanPhone}`);
    return NextResponse.json({ status: "success" });

  } catch (err) {
    console.error("[EASYORDER] Unexpected error:", err);
    // Ø¯Ø§ÙŠÙ…Ø§Ù‹ Ø±Ø¬Ù‘Ø¹ 200 Ø¹Ø´Ø§Ù† Easy-Order Ù…Ø§ ÙŠØ¹ÙŠØ¯Ø´ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

