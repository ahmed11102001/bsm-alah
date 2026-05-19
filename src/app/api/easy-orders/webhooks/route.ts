// src/app/api/easy-orders/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { attributeOrderToCampaign } from "@/lib/attribution";
import { triggerStoreAutomation } from "@/lib/store-automation";

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

export async function GET() {
  return NextResponse.json({ status: "ok", service: "EasyOrder Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[EASYORDER] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[EASYORDER] Payload:", JSON.stringify(payload).slice(0, 300));

    // ── استخراج بيانات الأوردر — بيدعم صيغ مختلفة ───────────────────────────
    const order = payload?.order ?? payload;

    const rawPhone: string =
      order?.phone              ??
      order?.customer_phone     ??
      order?.client_phone       ??
      order?.billing_phone      ??
      order?.customer?.phone    ??
      order?.billing_address?.phone ?? "";

    const customerName: string =
      order?.name               ??
      order?.customer_name      ??
      order?.client_name        ??
      order?.customer?.name     ??
      order?.customer?.first_name ?? "العميل";

    const orderNumber = String(order?.order_number ?? order?.id ?? order?.order_id ?? "");
    const totalStr    = String(order?.total ?? order?.total_price ?? order?.amount ?? "0");
    const revenue     = parseFloat(totalStr) || 0;
    const status      = order?.status ?? order?.order_status ?? "جديد";
    const externalId  = String(order?.id ?? order?.order_id ?? orderNumber);

    if (!rawPhone) {
      console.warn("[EASYORDER] No phone in payload");
      return NextResponse.json({ status: "ignored", reason: "no_phone" });
    }

    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      console.warn("[EASYORDER] Phone too short:", cleanPhone);
      return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
    }

    // ── جيب المتجر ────────────────────────────────────────────────────────────
    const easyStore = await prisma.easyOrdersStore.findUnique({
      where:  { userId },
      select: { id: true },
    });

    // ── Upsert contact ────────────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "العميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // ── حفظ StoreOrder ────────────────────────────────────────────────────────
    const storeOrder = await prisma.storeOrder.upsert({
      where:  { source_externalId_userId: { source: "easyorders", externalId, userId } },
      update: { status, total: revenue },
      create: {
        userId,
        source:           "easyorders",
        externalId,
        orderNumber,
        customerPhone:    cleanPhone,
        customerName,
        total:            revenue,
        currency:         "EGP",
        status,
        easyOrdersStoreId: easyStore?.id ?? null,
        orderedAt:        new Date(),
      },
    });

    // ── Revenue Attribution ───────────────────────────────────────────────────
    await attributeOrderToCampaign({
      userId,
      customerPhone: cleanPhone,
      storeOrderId:  storeOrder.id,
      revenue,
    });

    // ── Inngest: رسالة تأكيد الأوردر ─────────────────────────────────────────
    await inngest.send({
      name: "easyorder/order.received",
      data: {
        userId,
        contactId:        contact.id,
        phone:            cleanPhone,
        name:             customerName,
        orderNumber,
        total:            totalStr,
        status,
        easyOrdersStoreId: easyStore?.id ?? null,
      },
    });

    // ── أتمتة تأكيد الأوردر: بعت قالب واتساب فوراً لو الأتمتة متفعّلة ──
    if (easyStore?.id) {
      // ── أتمتة تأكيد الأوردر: بيبعت قالب ميتا مع متغيرات الأوردر الحقيقية ──
      await triggerStoreAutomation({
        userId,
        automationType: "order_confirm",
        storeSource:    "easyorders",
        storeId:        easyStore.id,
        customerPhone:  cleanPhone,
        contactId:      contact.id,
        // {{1}} اسم العميل  {{2}} رقم الأوردر  {{3}} الإجمالي
        templateVars: {
          body: [customerName, orderNumber, totalStr],
        },
      });
    }

    console.log(`[EASYORDER] ✓ Order #${orderNumber} processed for ${cleanPhone}`);
    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("[EASYORDER] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}