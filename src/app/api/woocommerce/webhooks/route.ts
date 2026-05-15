// src/app/api/woocommerce/webhooks/route.ts
// ─── ويب هوك WooCommerce — نفس بنية EasyOrders بالضبط ───────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";

// ── Token helper (نفس طريقة EasyOrders) ──────────────────────────────────────
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateWooWebhookUrl(userId: string): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://whatsprosystem.vercel.app";
  const token = userToken(userId);
  return `${base}/api/woocommerce/webhooks?uid=${userId}&token=${token}`;
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "WooCommerce Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    // ── Authenticate via uid + token ──────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[WOO] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[WOO] Payload:", JSON.stringify(payload).slice(0, 300));

    // ── استخراج بيانات الأوردر — WooCommerce يبعت الأوردر مباشرة ─────────────
    const order = payload?.order ?? payload;

    // رقم التليفون من billing أو shipping
    const rawPhone: string =
      order?.billing?.phone         ??
      order?.shipping?.phone        ??
      order?.billing_phone          ??
      order?.customer_phone         ??
      order?.phone                  ?? "";

    // اسم العميل
    const firstName: string = order?.billing?.first_name ?? order?.first_name ?? "";
    const lastName:  string = order?.billing?.last_name  ?? order?.last_name  ?? "";
    const customerName: string =
      [firstName, lastName].filter(Boolean).join(" ") ||
      order?.customer_name    ??
      order?.billing?.company ?? "العميل";

    const orderNumber = String(order?.number ?? order?.order_number ?? order?.id ?? "");
    const totalStr    = String(order?.total  ?? order?.total_price  ?? "0");
    const revenue     = parseFloat(totalStr) || 0;
    const status      = order?.status ?? "pending";
    const currency    = order?.currency ?? "EGP";
    const externalId  = String(order?.id ?? order?.order_id ?? orderNumber);

    if (!rawPhone) {
      console.warn("[WOO] No phone in payload");
      return NextResponse.json({ status: "ignored", reason: "no_phone" });
    }

    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      console.warn("[WOO] Phone too short:", cleanPhone);
      return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
    }

    // ── جيب المتجر ────────────────────────────────────────────────────────────
    const wooStore = await prisma.wooCommerceStore.findUnique({
      where:  { userId },
      select: { id: true },
    });

    // ── Upsert Contact ────────────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "العميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // ── حفظ StoreOrder ────────────────────────────────────────────────────────
    const storeOrder = await prisma.storeOrder.upsert({
      where: { source_externalId_userId: { source: "woocommerce", externalId, userId } },
      update: { status, total: revenue },
      create: {
        userId,
        source:              "woocommerce",
        externalId,
        orderNumber,
        customerPhone:       cleanPhone,
        customerName,
        total:               revenue,
        currency,
        status,
        wooCommerceStoreId:  wooStore?.id ?? null,
        orderedAt:           new Date(),
      },
    });

    // ── Revenue Attribution ───────────────────────────────────────────────────
    await attributeOrderToCampaign({
      userId,
      customerPhone: cleanPhone,
      storeOrderId:  storeOrder.id,
      revenue,
    });

    // ── Inngest: أتمتة تأكيد الأوردر ─────────────────────────────────────────
    await inngest.send({
      name: "woocommerce/order.received",
      data: {
        userId,
        contactId:          contact.id,
        phone:              cleanPhone,
        name:               customerName,
        orderNumber,
        total:              totalStr,
        currency,
        status,
        wooCommerceStoreId: wooStore?.id ?? null,
      },
    });

    // ── تحديث عداد المزامنة ───────────────────────────────────────────────────
    if (wooStore) {
      await prisma.wooCommerceStore.update({
        where: { id: wooStore.id },
        data:  { lastSyncAt: new Date(), totalSynced: { increment: 1 } },
      });
    }

    console.log(`[WOO] ✓ Order #${orderNumber} processed for ${cleanPhone}`);
    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("[WOO] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}