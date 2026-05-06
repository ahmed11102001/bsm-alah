// src/app/api/easyorder/webhook/route.ts
// ─── استقبال أوردرات EasyOrder وإرسال رسالة واتساب للعميل ─────────────────

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

// ─── توليد/التحقق من token المستخدم ─────────────────────────────────────────
// بنعمل HMAC(userId, NEXTAUTH_SECRET) — بدون ما نحتاج field جديد في الـ DB
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateEasyOrderWebhookUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(userId);
  return `${base}/api/easyorder/webhook?uid=${userId}&token=${token}`;
}

// ─── GET — للتحقق من الـ endpoint (بعض المنصات بتعمل GET verification) ───────
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", service: "EasyOrder Webhook" });
}

// ─── POST — استقبال الأوردر ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    // ── التحقق من الـ token ───────────────────────────────────────────────
    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[EASYORDER] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse الـ body ────────────────────────────────────────────────────
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[EASYORDER] Received payload:", JSON.stringify(payload).slice(0, 300));

    // ── استخراج بيانات الأوردر — بيدعم صيغ مختلفة لـ EasyOrder ──────────
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
      "العميل";

    const orderNumber: string =
      String(order?.order_number ?? order?.id ?? order?.order_id ?? "");

    const total: string =
      String(order?.total ?? order?.total_price ?? order?.amount ?? "");

    const status: string =
      order?.status ?? order?.order_status ?? "جديد";

    if (!phone) {
      console.warn("[EASYORDER] No phone number found in payload");
      return NextResponse.json({ status: "ignored", reason: "no_phone" });
    }

    // تنظيف الرقم — شيل كل حاجة غير رقم
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      console.warn("[EASYORDER] Phone too short:", cleanPhone);
      return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
    }

    // ── جيب حساب واتساب المستخدم ─────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        whatsappAccount: {
          select: { accessToken: true, phoneNumberId: true },
        },
      },
    });

    if (!user?.whatsappAccount) {
      console.warn("[EASYORDER] No WhatsApp account for user:", userId);
      return NextResponse.json({ status: "ignored", reason: "no_whatsapp" });
    }

    // ── Upsert الـ contact ────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: name !== "العميل" ? name : undefined },
      create: { phone: cleanPhone, userId, name },
    });

    // ── ابعت Inngest event عشان يبعت الرسالة ─────────────────────────────
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

    console.log(`[EASYORDER] ✓ Order #${orderNumber} queued for WhatsApp to ${cleanPhone}`);
    return NextResponse.json({ status: "success" });

  } catch (err) {
    console.error("[EASYORDER] Unexpected error:", err);
    // دايماً رجّع 200 عشان EasyOrder ما يعيدش المحاولة
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}