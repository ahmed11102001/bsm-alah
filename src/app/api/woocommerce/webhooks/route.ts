// src/app/api/woocommerce/webhooks/route.ts
// ─── استقبال Webhooks من WooCommerce — token-based auth ──────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createHmac }                from "crypto";
import prisma                        from "@/lib/prisma";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";

function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(`woo:${userId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "WooCommerce Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth بـ uid + token ──────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[WooCommerce WH] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── جيب المتجر ───────────────────────────────────────────────────────────
    const store = await prisma.wooCommerceStore.findUnique({
      where:  { userId },
      select: { id: true, userId: true },
    });

    if (!store) {
      console.warn("[WooCommerce WH] Store not found for userId:", userId);
      return NextResponse.json({ status: "ignored" });
    }

    let payload: any;
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // ── WooCommerce webhook topic ─────────────────────────────────────────────
    const topic = req.headers.get("x-wc-webhook-topic") || "";
    console.log(`[WooCommerce WH] ${topic} — userId: ${userId}`);

    if (topic.startsWith("order.")) {
      await handleOrder(payload, store.userId, store.id, topic);
    }

    // تحديث lastSyncAt
    await prisma.wooCommerceStore.update({
      where: { id: store.id },
      data:  { lastSyncAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("[WooCommerce WH] Unexpected error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ─── معالجة أوردر WooCommerce ─────────────────────────────────────────────────
async function handleOrder(
  order:            any,
  userId:           string,
  woocommerceStoreId: string,
  topic:            string,
) {
  try {
    // ── استخراج رقم الهاتف ──────────────────────────────────────────────────
    const rawPhone: string =
      order.billing?.phone ||
      order.shipping?.phone ||
      "";

    if (!rawPhone) {
      console.warn(`[WooCommerce] Order ${order.id} — no phone, skipping`);
      return;
    }

    const cleanPhone   = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) return;

    const customerName = [order.billing?.first_name, order.billing?.last_name]
      .filter(Boolean).join(" ") || "عميل";

    const revenue    = parseFloat(order.total ?? "0") || 0;
    const externalId = String(order.id);
    const currency   = order.currency ?? "EGP";
    const status     = order.status   ?? "pending";

    // ── Upsert Contact ──────────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "عميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // ── Upsert StoreOrder ───────────────────────────────────────────────────
    const storeOrder = await prisma.storeOrder.upsert({
      where: {
        source_externalId_userId: {
          source: "woocommerce" as any,
          externalId,
          userId,
        },
      },
      update: { status, total: revenue },
      create: {
        userId,
        source:             "woocommerce" as any,
        externalId,
        orderNumber:        String(order.number ?? order.id),
        customerName,
        customerPhone:      cleanPhone,
        total:              revenue,
        currency,
        status,
        rawData:            order,
        contactId:          contact.id,
        wooCommerceStoreId: woocommerceStoreId,
        orderedAt:          order.date_created ? new Date(order.date_created) : new Date(),
      },
    });

    // ── تحديث عداد المتجر ────────────────────────────────────────────────────
    await prisma.wooCommerceStore.update({
      where: { id: woocommerceStoreId },
      data:  { totalSynced: { increment: 1 } },
    }).catch(() => {});

    // ── Revenue Attribution ──────────────────────────────────────────────────
    if (topic === "order.created") {
      await attributeOrderToCampaign({
        userId,
        customerPhone: cleanPhone,
        storeOrderId:  storeOrder.id,
        revenue,
      });

      // ── Inngest: إشعار أوردر جديد ─────────────────────────────────────────
      await inngest.send({
        name: "woocommerce/order.created",
        data: {
          userId,
          contactId:     contact.id,
          orderId:       order.id,
          orderNumber:   order.number,
          totalPrice:    order.total,
          customerName,
          customerEmail: order.billing?.email,
          customerPhone: cleanPhone,
          woocommerceStoreId,
        },
      });
    }

  } catch (error) {
    console.error("[WooCommerce] handleOrder error:", error);
  }
}