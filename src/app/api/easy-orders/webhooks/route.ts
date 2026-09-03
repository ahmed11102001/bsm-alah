// src/app/api/easy-orders/webhooks/route.ts
//
// EasyOrders webhook authentication contract (per official docs):
//   - EasyOrders POSTs to whatever URL the seller configured in their
//     dashboard, and sends a "secret" header carrying the value EasyOrders
//     generated when the webhook was created.
//   - There is no "uid + token" contract on EasyOrders' side — that was a
//     home-grown scheme from the old integration. It is removed: the only
//     real authentication is verifying the "secret" header against the
//     store's stored webhookSecret.
//   - "uid" stays as a query param purely for routing (which WANI user this
//     webhook belongs to) since the URL we generate is user-specific, but it
//     carries no authentication weight by itself.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { decryptToken, isEncrypted } from "@/lib/crypto";
import { attributeOrderToCampaign } from "@/lib/attribution";
import { triggerStoreAutomation } from "@/lib/store-automation";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "EasyOrders Webhook" });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// EasyOrders يولّد سِر مختلف لكل Webhook — حتى لو كل الـ Webhooks بتشاور على
// نفس الـ URL. عشان كده لازم Webhook منفصل لكل event type، وسِر منفصل لكل
// واحد فيهم يتقارن بيه.
function pickExpectedSecretField(eventType: string | undefined): "webhookSecretOrders" | "webhookSecretStatusUpdate" {
  return eventType === "order-status-update" ? "webhookSecretStatusUpdate" : "webhookSecretOrders";
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");

    if (!userId) {
      console.warn("[EasyOrders] Webhook received without uid");
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    console.log("[EasyOrders] Webhook received");

    const store = await prisma.easyOrdersStore.findUnique({
      where:  { userId },
      select: { id: true, webhookSecretOrders: true, webhookSecretStatusUpdate: true },
    });

    if (!store) {
      console.warn("[EasyOrders] Webhook received for unknown/unconnected store");
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── الفصل بناءً على event_type ─────────────────────────────────────────
    // EasyOrders ترسل نوعين مختلفين من الـ Webhook على نفس الرابط (لو المستخدم
    // عمل Webhook منفصل لكل نوع، وده المتوقع دلوقتي):
    // 1. Order Created: يحتوي على بيانات الأوردر الكاملة
    // 2. Order Status Change: يحتوي على event_type = "order-status-update"
    const eventType = payload?.event_type;
    const expectedField = pickExpectedSecretField(eventType);
    const storedSecret = store[expectedField];

    if (!storedSecret) {
      console.warn(`[EasyOrders] Webhook Not Configured — no secret saved for event type "${eventType ?? "orders"}"`);
      return NextResponse.json({ error: "Webhook not configured" }, { status: 428 });
    }

    const providedSecret = req.headers.get("secret") ?? "";
    const expectedSecret = isEncrypted(storedSecret) ? decryptToken(storedSecret) : storedSecret;

    if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
      console.warn("[EasyOrders] Webhook signature/secret validation failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (eventType === "order-status-update") {
      return handleOrderStatusUpdate(payload, userId, store.id);
    }

    return handleOrderCreated(payload, userId, store.id);
  } catch (err) {
    console.error("[EasyOrders] Webhook unexpected error:", err);
    // 200 عشان EasyOrders متعملش retry storm لو الخطأ من عندنا مش قابل للحل بإعادة المحاولة
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Created — إنشاء أوردر جديد
// ═══════════════════════════════════════════════════════════════════════════════
async function handleOrderCreated(payload: any, userId: string, easyOrdersStoreId: string) {
  const order = payload?.order ?? payload;

  const rawPhone: string =
    order?.phone              ??
    order?.customer_phone     ??
    order?.client_phone       ??
    order?.billing_phone      ??
    order?.customer?.phone    ??
    order?.billing_address?.phone ?? "";

  // EasyOrders ترسل اسم العميل في full_name
  const customerName: string =
    order?.full_name          ??
    order?.name               ??
    order?.customer_name      ??
    order?.client_name        ??
    order?.customer?.name     ??
    order?.customer?.first_name ?? "العميل";

  const orderNumber = String(order?.order_number ?? order?.id ?? order?.order_id ?? "");
  const totalStr    = String(order?.total ?? order?.total_cost ?? order?.total_price ?? order?.amount ?? "0");
  const revenue     = parseFloat(totalStr) || 0;
  const status      = order?.status ?? order?.order_status ?? "pending";
  const externalId  = String(order?.id ?? order?.order_id ?? orderNumber);

  if (!rawPhone) {
    console.warn("[EasyOrders] Webhook ignored: no phone in payload");
    return NextResponse.json({ status: "ignored", reason: "no_phone" });
  }

  const cleanPhone = rawPhone.replace(/\D/g, "");
  if (cleanPhone.length < 9) {
    console.warn("[EasyOrders] Webhook ignored: phone too short");
    return NextResponse.json({ status: "ignored", reason: "invalid_phone" });
  }

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
      source:            "easyorders",
      externalId,
      orderNumber,
      customerPhone:     cleanPhone,
      customerName,
      total:             revenue,
      currency:          "EGP",
      status,
      rawData:           order as object,
      easyOrdersStoreId,
      orderedAt:         new Date(),
    },
  });

  // ── Revenue Attribution ───────────────────────────────────────────────────
  await attributeOrderToCampaign({
    userId,
    customerPhone: cleanPhone,
    storeOrderId:  storeOrder.id,
    revenue,
  });

  // ── أتمتة تأكيد الأوردر: بعت قالب واتساب فوراً لو الأتمتة متفعّلة ──
  await triggerStoreAutomation({
    userId,
    automationType: "order_confirm",
    storeSource:    "easyorders",
    storeId:        easyOrdersStoreId,
    customerPhone:  cleanPhone,
    contactId:      contact.id,
    storeOrderId:   storeOrder.id,
    // {{1}} اسم العميل  {{2}} رقم الأوردر  {{3}} الإجمالي
    templateVars: {
      body: [customerName, orderNumber, totalStr],
    },
  });

  console.log(`[EasyOrders] ✓ Order #${orderNumber} processed`);
  return NextResponse.json({ status: "success" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Status Update — تحديث حالة الأوردر (شحن، دفع، إلخ)
// ═══════════════════════════════════════════════════════════════════════════════
async function handleOrderStatusUpdate(payload: any, userId: string, easyOrdersStoreId: string) {
  const orderId   = String(payload?.order_id ?? "");
  const newStatus = payload?.new_status ?? "";

  if (!orderId) {
    console.warn("[EasyOrders] Status update ignored: no order_id");
    return NextResponse.json({ status: "ignored", reason: "no_order_id" });
  }

  console.log(`[EasyOrders] Status update received for order`);

  const storeOrder = await prisma.storeOrder.findFirst({
    where: {
      source:     "easyorders",
      externalId: orderId,
      userId,
    },
    select: {
      id:                true,
      orderNumber:       true,
      customerPhone:     true,
      customerName:      true,
      easyOrdersStoreId: true,
    },
  });

  if (!storeOrder) {
    console.warn("[EasyOrders] Status update ignored: order not found locally");
    return NextResponse.json({ status: "ignored", reason: "order_not_found" });
  }

  await prisma.storeOrder.update({
    where: { id: storeOrder.id },
    data:  { status: newStatus },
  });

  // ── أتمتة الشحن: لو الحالة الجديدة = in_delivery ──────────────────────
  if (newStatus === "in_delivery" && storeOrder.easyOrdersStoreId) {
    const cleanPhone = storeOrder.customerPhone;

    if (!cleanPhone) {
      console.warn("[EasyOrders] Shipping automation skipped: no phone stored for order");
      return NextResponse.json({ status: "updated", shipped: false, reason: "no_phone" });
    }

    const contact = await prisma.contact.findFirst({
      where:  { phone: cleanPhone, userId },
      select: { id: true },
    });

    if (contact) {
      // EasyOrders لا توفر رابط تتبع في الـ payload، لذا نستخدم "—" كنص بديل
      await triggerStoreAutomation({
        userId,
        automationType: "order_shipped",
        storeSource:    "easyorders",
        storeId:        storeOrder.easyOrdersStoreId,
        customerPhone:  cleanPhone,
        contactId:      contact.id,
        storeOrderId:   storeOrder.id,
        // {{1}} رقم الأوردر  {{2}} رابط التتبع
        templateVars: {
          body: [storeOrder.orderNumber ?? orderId, "—"],
        },
      });

      console.log(`[EasyOrders] ✓ Shipped automation triggered`);
    } else {
      console.warn("[EasyOrders] Shipping automation skipped: no contact found for phone");
    }
  }

  console.log(`[EasyOrders] ✓ Status updated → ${newStatus}`);
  return NextResponse.json({ status: "updated", newStatus });
}
