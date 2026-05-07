// src/app/api/easy-orders/webhooks/route.ts
// ─── استقبال أوردرات EasyOrders وحفظها في قاعدة البيانات ─────────────────────
// بدون إرسال رسائل تلقائي — الإرسال يتم من صفحة الأتمتة فقط

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

// ─── توليد/التحقق من token المستخدم (HMAC بدون field جديد في DB) ──────────────
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateEasyOrderWebhookUrl(userId: string): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(userId);
  return `${base}/api/easy-orders/webhooks?uid=${userId}&token=${token}`;
}

// ─── GET — للتحقق من الـ endpoint ────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: "ok", service: "EasyOrders Webhook" });
}

// ─── POST — استقبال الأوردر وحفظه ───────────────────────────────────────────
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
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    console.log("[EASY-ORDER] Received:", JSON.stringify(payload).slice(0, 200));

    // ── استخراج بيانات الأوردر — بيدعم صيغ مختلفة ──────────────────────
    const order = payload?.order ?? payload;

    const rawPhone: string =
      order?.phone               ??
      order?.customer_phone      ??
      order?.client_phone        ??
      order?.billing_phone       ??
      order?.customer?.phone     ??
      order?.billing_address?.phone ?? "";

    const name: string =
      order?.name                ??
      order?.customer_name       ??
      order?.client_name         ??
      order?.customer?.name      ??
      order?.customer?.first_name ?? "عميل";

    const externalId: string =
      String(order?.id ?? order?.order_id ?? Date.now());

    const orderNumber: string =
      String(order?.order_number ?? order?.id ?? "");

    const total: string =
      String(order?.total ?? order?.total_price ?? order?.amount ?? "");

    const currency: string =
      order?.currency ?? "EGP";

    const status: string =
      order?.status ?? order?.order_status ?? "pending";

    if (!rawPhone) {
      console.warn("[EASYORDER] No phone in payload");
      return NextResponse.json({ status: "ignored", reason: "no_phone" });
    }

    const phone = rawPhone.replace(/\D/g, "");
    if (phone.length < 9) {
      return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
    }

    // ── Upsert Contact ────────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone, userId } },
      update: { name: name !== "عميل" ? name : undefined },
      create: { phone, userId, name },
    });

    // ── Upsert StoreOrder ─────────────────────────────────────────────────
    await prisma.storeOrder.upsert({
      where: {
        userId_source_externalId: { userId, source: "easyorders", externalId },
      },
      update: { status, total },
      create: {
        userId,
        source:        "easyorders",
        externalId,
        orderNumber,
        customerName:  name,
        customerPhone: phone,
        total,
        currency,
        status,
        rawData:       payload,
        contactId:     contact.id,
      },
    });

    // ── تحديث عداد المزامنة ───────────────────────────────────────────────
    await prisma.easyOrdersStore.updateMany({
      where: { userId },
      data:  { lastSyncAt: new Date(), totalSynced: { increment: 1 } },
    });

    console.log(`[EASYORDER] ✓ Order #${orderNumber} saved for user ${userId}`);
    // دايماً 200 عشان EasyOrders ما يعيدش المحاولة
    return NextResponse.json({ status: "success" });

  } catch (err) {
    console.error("[EASYORDER] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
