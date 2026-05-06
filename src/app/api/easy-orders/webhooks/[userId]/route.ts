import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import crypto from "crypto";

/**
 * POST /api/easy-orders/webhooks/[userId]
 *
 * نقطة الاستقبال الخاصة بكل تاجر.
 * إيزي أوردرز يرسل هنا عند:
 *   - إنشاء طلب جديد   (order_created  / order.created)
 *   - تحديث حالة الطلب (order_updated  / order.updated  / status_updated)
 *
 * التحقق من الطلب:
 *   إيزي أوردرز يرسل header: X-EasyOrders-Signature = HMAC-SHA256(rawBody, webhookSecret)
 *   لو مش موجود — بنقبل الطلب مع تسجيل تحذير (بعض الإعدادات القديمة مش بترسل signature)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    // ── 1. قراءة الـ body كنص خام ────────────────────────────────────────────
    const rawBody = await req.text();

    // ── 2. جيب إعدادات التاجر من قاعدة البيانات ─────────────────────────────
    const store = await prisma.easyOrdersStore.findUnique({
      where:  { userId },
      select: { webhookSecret: true, isActive: true, storeName: true },
    });

    if (!store || !store.isActive) {
      console.warn(`[EasyOrders Webhook] Store not found or inactive for userId: ${userId}`);
      return NextResponse.json({ status: "ignored" });
    }

    // ── 3. التحقق من التوقيع (Signature Verification) ───────────────────────
    const signatureHeader = req.headers.get("X-EasyOrders-Signature") || "";

    if (signatureHeader) {
      const expectedSig = crypto
        .createHmac("sha256", store.webhookSecret)
        .update(rawBody)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSig)
      );

      if (!isValid) {
        console.warn(`[EasyOrders Webhook] Invalid signature for userId: ${userId}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      // بعض الإصدارات القديمة من إيزي أوردرز مش بترسل signature
      console.warn(`[EasyOrders Webhook] No signature header for userId: ${userId} — proceeding anyway`);
    }

    // ── 4. تحليل الـ payload ─────────────────────────────────────────────────
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[EasyOrders Webhook] Failed to parse JSON body");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── 5. تحديد نوع الحدث ───────────────────────────────────────────────────
    // إيزي أوردرز بيرسل الحدث في حقل event أو type
    const eventType: string =
      payload.event || payload.type || payload.hook_event || "";

    console.log(`[EasyOrders Webhook] Event: "${eventType}" | User: ${userId} | Store: ${store.storeName}`);

    // ── 6. توجيه الحدث ───────────────────────────────────────────────────────
    switch (eventType.toLowerCase()) {
      case "order_created":
      case "order.created":
      case "new_order":
        await handleOrderCreated(payload, userId);
        break;

      case "order_updated":
      case "order.updated":
      case "status_updated":
      case "order_status_changed":
        await handleOrderUpdated(payload, userId);
        break;

      default:
        console.log(`[EasyOrders Webhook] Unhandled event type: "${eventType}"`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[EasyOrders Webhook] Unhandled error:", error);
    // نرجع 200 عشان إيزي أوردرز ميعيدش الإرسال
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * استخراج رقم الهاتف وتنسيقه بصيغة دولية (مصري مثلاً: 01xxxxxxxxx → 201xxxxxxxxx)
 */
function normalizeEgyptianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // لو بدأ بـ 0 وطوله 11 (مثلاً 01012345678) → اشله وحط 20
  if (digits.startsWith("0") && digits.length === 11) {
    return "2" + digits; // 2 + 01012345678 = 20 1012345678
  }

  // لو بدأ بـ 20 اتركه زي ما هو
  if (digits.startsWith("20")) {
    return digits;
  }

  // غير ذلك اتركه كما هو وسجّل تحذير
  console.warn(`[EasyOrders] Unexpected phone format: ${raw}`);
  return digits;
}

/**
 * استخراج بيانات العميل من payload إيزي أوردرز
 * (إيزي أوردرز بترسل الـ order مباشرة أو جوه حقل order أو data)
 */
function extractOrderData(payload: any) {
  const order = payload.order || payload.data || payload;

  const customerName: string =
    order.customer_name ||
    order.client_name   ||
    `${order.first_name || ""} ${order.last_name || ""}`.trim() ||
    "عميل";

  const rawPhone: string =
    order.phone            ||
    order.customer_phone   ||
    order.client_phone     ||
    order.mobile           ||
    "";

  const orderId: string =
    String(order.id || order.order_id || order.reference || "");

  const orderNumber: string =
    String(order.number || order.order_number || orderId);

  const totalPrice: string =
    String(order.total || order.total_price || order.amount || "0");

  const status: string =
    order.status || order.order_status || "";

  return { customerName, rawPhone, orderId, orderNumber, totalPrice, status, order };
}

// ─────────────────────────────────────────────────────────────────────────────
async function handleOrderCreated(payload: any, userId: string) {
  try {
    const { customerName, rawPhone, orderId, orderNumber, totalPrice } =
      extractOrderData(payload);

    if (!rawPhone) {
      console.warn(`[EasyOrders] Order ${orderId} has no phone number`);
      return;
    }

    const phone = normalizeEgyptianPhone(rawPhone);

    // Upsert contact
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone, userId } },
      update: { name: customerName },
      create: { phone, userId, name: customerName },
    });

    // أرسل حدث لـ Inngest لمعالجة الرسالة
    await inngest.send({
      name: "easy-orders/order.created",
      data: {
        userId,
        contactId:    contact.id,
        orderId,
        orderNumber,
        totalPrice,
        customerName,
        customerPhone: phone,
      },
    });

    console.log(`[EasyOrders] Order created event sent: #${orderNumber} | ${phone}`);
  } catch (error) {
    console.error("[EasyOrders] handleOrderCreated error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function handleOrderUpdated(payload: any, userId: string) {
  try {
    const { customerName, rawPhone, orderId, orderNumber, status } =
      extractOrderData(payload);

    if (!rawPhone) {
      console.warn(`[EasyOrders] Order ${orderId} update has no phone number`);
      return;
    }

    const phone = normalizeEgyptianPhone(rawPhone);

    await inngest.send({
      name: "easy-orders/order.updated",
      data: {
        userId,
        orderId,
        orderNumber,
        status,
        customerName,
        customerPhone: phone,
      },
    });

    console.log(`[EasyOrders] Order updated event sent: #${orderNumber} | status: ${status}`);
  } catch (error) {
    console.error("[EasyOrders] handleOrderUpdated error:", error);
  }
}
