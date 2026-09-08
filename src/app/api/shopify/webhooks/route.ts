// src/app/api/shopify/webhooks/route.ts
// ─── ويب هوك Shopify — نظام uid+token زي EasyOrders ─────────────────────────
//
// طبقتين حماية دلوقتي:
// 1) uid+token (زي ما كان دايمًا) — بيثبت إن الـ URL معروف بس للي عنده الـ secret.
// 2) X-Shopify-Hmac-Sha256 (لو فيه secret نقدر نتحقق بيه) — بيثبت إن الـ body
//    فعلاً جاي من شوبيفاي ومتغيّرش في الطريق. نجرب SHOPIFY_APP_CLIENT_SECRET
//    (متاجر OAuth) وبعدين clientSecret الخاص بالمتجر (متاجر Client Credentials)؛
//    لو المتجر legacy token بس من غير أي secret معروف، منعرفش نتحقق من الـHMAC
//    فبنكتفي بطبقة uid+token زي ما هي (مش قادرين نخترع secret مش موجود).
//
// ملاحظة: الـ3 GDPR topics (customers/data_request, customers/redact,
// shop/redact) انتقلوا لـ /api/shopify/compliance — شوبيفاي مش بتسمح بتسجيلهم
// عبر REST /webhooks.json العادي أصلاً، فمفيش داعي يتعاملوا هنا كمان.
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma                        from "@/lib/prisma";
import { decryptToken }              from "@/lib/crypto";
import { inngest }                   from "@/inngest/client";
import { attributeOrderToCampaign }  from "@/lib/attribution";
import {
  type ShopifyOrder,
  type ShopifyCustomer,
  type ShopifyCheckout,
  isShopifyOrder,
  isShopifyCustomer,
  isShopifyCheckout,
} from "@/types/shopify";
import { triggerStoreAutomation } from "@/lib/store-automation";

// ── Token helper — نفس WooCommerce و EasyOrders ───────────────────────────────
function userToken(userId: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function generateShopifyWebhookUrl(userId: string): string {
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "https://aiwni.com";
  const token = userToken(userId);
  return `${base}/api/shopify/webhooks?uid=${userId}&token=${token}`;
}

// ── تحقق HMAC (نفس منطق شوبيفاي: base64(HMAC-SHA256(rawBody, secret))) ───────
function verifyShopifyHmac(rawBody: string, header: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "Shopify Webhook" });
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth بـ uid + token ───────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");
    const token  = searchParams.get("token");

    if (!userId || !token || token !== userToken(userId)) {
      console.warn("[Shopify WH] Invalid token for uid:", userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topic = req.headers.get("X-Shopify-Topic")
                ?? req.headers.get("x-shopify-topic")
                ?? "";

    // ── جيب المتجر (قبل قراءة الـbody — محتاجين clientSecret لو موجود) ────────
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where:  { userId },
      select: { id: true, userId: true, shop: true, clientSecret: true },
    });

    if (!shopifyStore) {
      console.warn(`[Shopify WH] Store not found for userId: ${userId}`);
      return NextResponse.json({ status: "ignored" });
    }

    // ── الـbody الخام أولاً — الـHMAC بيتحسب على النص الخام قبل أي parsing ─────
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256") ?? req.headers.get("x-shopify-hmac-sha256");

    const candidateSecrets = [
      process.env.SHOPIFY_APP_CLIENT_SECRET,
      shopifyStore.clientSecret ? decryptToken(shopifyStore.clientSecret) : null,
    ].filter((s): s is string => Boolean(s));

    if (hmacHeader && candidateSecrets.length > 0) {
      const verified = candidateSecrets.some(secret => verifyShopifyHmac(rawBody, hmacHeader, secret));
      if (!verified) {
        console.warn(`[Shopify WH] HMAC mismatch — store: ${shopifyStore.shop}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (candidateSecrets.length === 0) {
      // متجر legacy token يدوي من غير أي secret معروف — منقدرش نتحقق من الـHMAC،
      // فبنكتفي بطبقة uid+token اللي فوق (سلوك السنين اللي فاتت، من غير تغيير).
      console.log(`[Shopify WH] No signing secret known for ${shopifyStore.shop} — relying on uid+token only`);
    }

    let payload: unknown;
    try { payload = JSON.parse(rawBody); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    console.log(`[Shopify WH] ${topic || "order"} — store: ${shopifyStore.shop}`);

    // ── Route by topic ────────────────────────────────────────────────────────
    switch (topic) {
      case "orders/create":
      case "":   // لو مفيش topic بيتعامل معاه كـ order created
        if (isShopifyOrder(payload)) {
          await handleOrderCreated(payload, userId, shopifyStore.id);
        } else {
          console.warn("[Shopify WH] orders/create — invalid payload shape");
        }
        break;

      case "orders/updated":
        if (isShopifyOrder(payload)) {
          await handleOrderUpdated(payload, userId, shopifyStore.id);
        }
        break;

      case "orders/fulfilled":
        if (isShopifyOrder(payload)) {
          await handleOrderFulfilled(payload, userId, shopifyStore.id);
        }
        break;

      // ── السلة المهجورة — Abandoned Checkout ──────────────────────────────
      case "checkouts/create":
      case "checkouts/update":
        if (isShopifyCheckout(payload)) {
          await handleCheckoutAbandoned(payload, userId, shopifyStore.id);
        } else {
          console.warn(`[Shopify WH] ${topic} — invalid checkout payload`);
        }
        break;

      case "customers/create":
        if (isShopifyCustomer(payload)) {
          await handleCustomerCreated(payload, userId);
        }
        break;

      case "customers/update":
        if (isShopifyCustomer(payload)) {
          await handleCustomerUpdated(payload, userId);
        }
        break;

      // ── تعطيل التطبيق: التاجر عمل uninstall من شوبيفاي ─────────────────────
      case "app/uninstalled":
        await handleAppUninstalled(userId, shopifyStore.shop);
        break;

      // ملاحظة: الـ3 GDPR topics (customers/data_request, customers/redact,
      // shop/redact) بقوا بيوصلوا لـ /api/shopify/compliance مباشرة — شوبيفاي
      // بترفض تسجيلهم أصلاً عبر REST /webhooks.json العادي زي باقي التوبيكات
      // هنا، فمفيش case ليهم في السويتش ده.

      default:
        console.log(`[Shopify WH] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[Shopify WH] Unexpected error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleOrderCreated(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    const rawPhone: string =
      order.customer?.phone       ??
      order.billing_address?.phone ??
      order.phone                 ?? "";

    if (!rawPhone) {
      console.warn(`[Shopify] Order ${order.id} — no phone, skipping`);
      return;
    }

    // ── Bugfix: تجاهل الأوردرات الملغية أو المرتجعة ────────────────────────
    const SKIP_STATUSES = ["voided", "refunded", "expired"];
    if (SKIP_STATUSES.includes(order.financial_status ?? "")) {
      console.log(`[Shopify] Order ${order.id} skipped — financial_status: ${order.financial_status}`);
      return;
    }

    const cleanPhone   = rawPhone.replace(/\D/g, "");
    const customerName = [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean).join(" ") || "عميل";
    const revenue    = parseFloat(order.total_price ?? "0") || 0;
    const externalId = String(order.id);

    // Upsert Contact
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "عميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    });

    // حفظ StoreOrder مع checkout_token عشان نتحقق من السلة المهجورة لاحقاً
    const checkoutToken = (order as any).checkout_token ?? null;
    const storeOrder = await prisma.storeOrder.upsert({
      where:  { source_externalId_userId: { source: "shopify", externalId, userId } },
      update: { status: order.financial_status ?? "pending", total: revenue },
      create: {
        userId,
        source:        "shopify",
        externalId,
        contactId:     contact.id,
        orderNumber:   String(order.order_number ?? order.id),
        customerPhone: cleanPhone,
        customerName,
        total:         revenue,
        currency:      order.currency ?? "EGP",
        status:        order.financial_status ?? "pending",
        shopifyStoreId,
        orderedAt:     order.created_at ? new Date(order.created_at) : new Date(),
        // نحفظ checkout_token في rawData عشان أتمتة السلة تتحقق منه
        rawData:       checkoutToken ? { checkoutToken } : undefined,
      },
    });

    // لو في checkout_token → علّم السلة إنها اتحولت لأوردر (recovered)
    if (checkoutToken) {
      await prisma.abandonedCart.updateMany({
        where: { externalId: checkoutToken, userId, recoveredAt: null },
        data:  { recoveredAt: new Date() },
      }).catch(() => {});
    }

    // Revenue Attribution
    await attributeOrderToCampaign({
      userId,
      customerPhone: cleanPhone,
      storeOrderId:  storeOrder.id,
      revenue,
    });

    // Inngest → أتمتة تأكيد الأوردر
    await inngest.send({
      name: "shopify/order.created",
      data: {
        userId,
        contactId:     contact.id,
        orderId:       order.id,
        orderNumber:   order.order_number ?? null,
        totalPrice:    order.total_price  ?? null,
        customerName,
        customerEmail: order.customer?.email ?? null,
        customerPhone: cleanPhone,
        shopifyStoreId,
      },
    });

    // تحديث عداد المزامنة
    await prisma.shopifyStore.update({
      where: { id: shopifyStoreId },
      data:  { updatedAt: new Date() },
    });

    // ── أتمتة تأكيد الأوردر: بيبعت قالب ميتا مع متغيرات الأوردر الحقيقية ──
    await triggerStoreAutomation({
      userId,
      automationType: "order_confirm",
      storeSource:    "shopify",
      storeId:        shopifyStoreId,
      customerPhone:  cleanPhone,
      contactId:      contact.id,
      storeOrderId:   storeOrder.id,
      // {{1}} اسم العميل  {{2}} رقم الأوردر  {{3}} الإجمالي
      templateVars: {
        body: [
          customerName,
          String(order.order_number ?? order.id),
          String(order.total_price ?? ""),
        ],
      },
    });

    console.log(`[Shopify] ✓ Order #${order.order_number} — ${cleanPhone}`);
  } catch (error) {
    console.error("[Shopify] handleOrderCreated error:", error);
  }
}

async function handleOrderUpdated(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: order.financial_status ?? "pending" },
    });

    if (order.fulfillment_status === "fulfilled") {
      const rawPhone = order.customer?.phone ?? order.billing_address?.phone ?? "";
      if (!rawPhone) return;

      // نجيب أول tracking URL من أول fulfillment
      const trackingUrl: string | null =
        order.fulfillments
          ?.flatMap(f => f.tracking_urls ?? (f.tracking_url ? [f.tracking_url] : []))
          ?.[0] ?? null;

      await inngest.send({
        name: "shopify/order.fulfilled",
        data: {
          userId,
          orderId:           order.id,
          orderNumber:       order.order_number ?? null,
          customerPhone:     rawPhone.replace(/\D/g, ""),
          trackingUrl,
          fulfillmentStatus: order.fulfillment_status,
          shopifyStoreId,
        },
      });
    }
  } catch (error) {
    console.error("[Shopify] handleOrderUpdated error:", error);
  }
}

async function handleOrderFulfilled(
  order: ShopifyOrder,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    const rawPhone = order.customer?.phone ?? order.billing_address?.phone ?? "";
    if (!rawPhone) return;

    const cleanPhone = rawPhone.replace(/\D/g, "");

    await prisma.storeOrder.updateMany({
      where: { source: "shopify", externalId: String(order.id), userId },
      data:  { status: "fulfilled" },
    });

    const trackingUrl: string | null =
      order.fulfillments
        ?.flatMap(f => f.tracking_urls ?? (f.tracking_url ? [f.tracking_url] : []))
        ?.[0] ?? null;

    await inngest.send({
      name: "shopify/order.fulfilled",
      data: {
        userId,
        orderId:           order.id,
        orderNumber:       order.order_number ?? null,
        customerPhone:     cleanPhone,
        trackingUrl,
        fulfillmentStatus: order.fulfillment_status ?? null,
        shopifyStoreId,
      },
    });

    // ── أتمتة تحديث الشحن: بعت قالب واتساب فوراً لو الأتمتة متفعّلة ──────
    const contact = await prisma.contact.findFirst({
      where:  { phone: cleanPhone, userId },
      select: { id: true },
    });
    if (contact) {
      // ── أتمتة تحديث الشحن: بيبعت قالب ميتا مع رقم الأوردر ورابط التتبع ──
      await triggerStoreAutomation({
        userId,
        automationType: "order_shipped",
        storeSource:    "shopify",
        storeId:        shopifyStoreId,
        customerPhone:  cleanPhone,
        contactId:      contact.id,
        // {{1}} رقم الأوردر  {{2}} رابط التتبع
        templateVars: {
          body: [
            String(order.order_number ?? order.id),
            trackingUrl ?? "—",
          ],
        },
      });
    }
  } catch (error) {
    console.error("[Shopify] handleOrderFulfilled error:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Abandoned Checkout — حفظ السلة + إرسال Inngest event بعد delay
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCheckoutAbandoned(
  checkout: ShopifyCheckout,
  userId: string,
  shopifyStoreId: string,
) {
  try {
    const rawPhone =
      checkout.customer?.phone ??
      checkout.billing_address?.phone ??
      checkout.phone ?? "";

    if (!rawPhone) {
      console.log(`[Shopify] Checkout ${checkout.token} — no phone, skipping`);
      return;
    }

    const cleanPhone   = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9) return;

    const customerName = [checkout.customer?.first_name, checkout.customer?.last_name]
      .filter(Boolean).join(" ") || "عميل";
    const cartTotal  = parseFloat(checkout.total_price ?? "0") || 0;
    const externalId = checkout.token;

    // حفظ / تحديث السلة في DB
    await prisma.abandonedCart.upsert({
      where:  { source_externalId_userId: { source: "shopify", externalId, userId } },
      update: {
        cartTotal,
        cartItems:  (checkout.line_items ?? []) as any,
        recoveryUrl: checkout.abandoned_checkout_url ?? null,
        updatedAt:  new Date(),
      },
      create: {
        userId,
        source:        "shopify",
        externalId,
        customerPhone: cleanPhone,
        customerName,
        cartTotal,
        cartItems:     (checkout.line_items ?? []) as any,
        recoveryUrl:   checkout.abandoned_checkout_url ?? null,
        shopifyStoreId,
      },
    });

    // Upsert Contact عشان نقدر نبعتله رسالة
    await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: { name: customerName !== "عميل" ? customerName : undefined },
      create: { phone: cleanPhone, userId, name: customerName },
    }).catch(() => {});

    // Inngest event — هيستنى ساعة ويتحقق إذا اشترى
    await inngest.send({
      name: "shopify/cart.abandoned",
      data: {
        userId,
        shopifyStoreId,
        checkoutToken: externalId,
        customerPhone: cleanPhone,
        customerName,
        cartTotal,
        cartItems: checkout.line_items ?? [],
        recoveryUrl: checkout.abandoned_checkout_url ?? null,
      },
    });

    console.log(`[Shopify] 🛒 Checkout saved — ${cleanPhone} — ${cartTotal}`);
  } catch (error) {
    console.error("[Shopify] handleCheckoutAbandoned error:", error);
  }
}

async function handleCustomerCreated(customer: ShopifyCustomer, userId: string) {
  try {
    const phone = customer.phone ?? customer.default_address?.phone;
    if (!phone) return;

    const cleanPhone = phone.replace(/\D/g, "");
    await prisma.contact.upsert({
      where:  { phone_userId: { phone: cleanPhone, userId } },
      update: {},
      create: {
        phone:  cleanPhone,
        userId,
        name:   customer.first_name ?? "عميل",
      },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerCreated error:", error);
  }
}

async function handleCustomerUpdated(customer: ShopifyCustomer, userId: string) {
  try {
    const phone = customer.phone ?? customer.default_address?.phone;
    if (!phone) return;

    await prisma.contact.updateMany({
      where: { phone: phone.replace(/\D/g, ""), userId },
      data:  { name: customer.first_name ?? undefined },
    });
  } catch (error) {
    console.error("[Shopify] handleCustomerUpdated error:", error);
  }
}

// ── app/uninstalled: التاجر شال التطبيق من متجره ──────────────────────────────
// نوقف استخدام التوكن/الاعتماد فورًا (مش هتنفع تتستخدم في نداءات API تانية)،
// من غير ما نمسح سجل المتجر نفسه أو أوردراته — ده مختلف عن shop/redact اللي
// بيحصل بعد 48 ساعة ولازم يمسح البيانات فعليًا حسب متطلبات GDPR.
async function handleAppUninstalled(userId: string, shop: string) {
  try {
    await prisma.shopifyStore.update({
      where: { userId },
      data: {
        isActive:             false,
        accessToken:          null,
        clientId:             null,
        clientSecret:         null,
        cachedAccessToken:    null,
        cachedTokenExpiresAt: null,
      },
    });
    console.log(`[Shopify WH] app/uninstalled — store deactivated: ${shop}`);
  } catch (error) {
    console.error("[Shopify WH] handleAppUninstalled error:", error);
  }
}

// ─── GDPR الإجبارية (Public App) ─────────────────────────────────────────────
// القاعدة الذهبية: أي خطأ داخلي يُلتقط هنا، والـroute الرئيسي يرد دائمًا 200 —
// شوبيفاي تعتبر أي رد غير 2xx فشلًا في الامتثال.
//
// ملاحظة تصميم: جهات الاتصال (Contact) مشتركة مع CRM الواتساب الخاص بالتاجر،
// لذلك التنفيذ يُخفي الهوية (anonymize) بدل الحذف الشامل — حذف المحادثات
// التجارية للتاجر سيكون تدميرًا لبياناته هو، لا امتثالًا. الصفوف الخاصة
// بالمتجر فقط (الأوردرات/السلات/الأتمتة/المتجر نفسه) تُحذف فعليًا.

export interface GdprCustomerPayload {
  shop_id?: unknown;
  shop_domain?: unknown;
  customer?: { id?: unknown; email?: unknown; phone?: unknown } | null;
  orders_requested?: unknown;
}

export interface GdprShopPayload {
  shop_id?: unknown;
  shop_domain?: unknown;
}

export type GdprStore = { id: string; userId: string; shop: string };

function gdprCustomerIdentity(payload: GdprCustomerPayload): { email: string | null; phone: string | null } {
  const c = payload.customer ?? {};
  const email = typeof c.email === "string" && c.email.includes("@") ? c.email : null;
  const rawPhone = typeof c.phone === "string" ? c.phone : null;
  const phone = rawPhone ? rawPhone.replace(/\D/g, "") || null : null;
  return { email, phone };
}

// ── customers/data_request: العميل طلب نسخة من بياناته ──────────────────────
// المطلوب: تزويد صاحب المتجر بالبيانات خلال 30 يومًا — نجمع ملخصًا فوريًا
// وننوّه الأدمن لاتخاذ إجراء (الرد نفسه 200 فوري).
export async function handleCustomerDataRequest(payload: unknown, userId: string, store: GdprStore) {
  try {
    const p = (payload ?? {}) as GdprCustomerPayload;
    const { email, phone } = gdprCustomerIdentity(p);
    if (typeof p.shop_domain === "string" && p.shop_domain && p.shop_domain !== store.shop) {
      console.warn(`[Shopify GDPR] data_request shop mismatch: ${p.shop_domain} ≠ ${store.shop}`);
    }

    let summary = "لا توجد بيانات مطابقة مخزنة لدينا";
    if (phone) {
      const [contacts, orders, carts] = await Promise.all([
        prisma.contact.count({ where: { userId, phone } }),
        prisma.storeOrder.count({ where: { userId, shopifyStoreId: store.id, customerPhone: phone } }),
        prisma.abandonedCart.count({ where: { userId, shopifyStoreId: store.id, customerPhone: phone } }),
      ]);
      summary = `جهات اتصال: ${contacts}، أوردرات شوبيفاي: ${orders}، سلات مهجورة: ${carts}`;
    }

    console.log(`[Shopify GDPR] data_request — shop=${store.shop} email=${email ?? "—"} phone=${phone ?? "—"} | ${summary}`);
    const { notifyAdminShopifyGdpr } = await import("@/lib/notifications");
    await notifyAdminShopifyGdpr("data_request", store.shop, email ?? phone ?? "—", summary);
  } catch (error) {
    console.error("[Shopify GDPR] data_request error:", error);
  }
}

// ── customers/redact: مسح بيانات عميل ────────────────────────────────────────
// نُخفي الهوية في الصفوف المشتركة (اسم/ملاحظات) ونحذف التسويقية الخاصة بالمتجر.
export async function handleCustomerRedact(payload: unknown, userId: string, store: GdprStore) {
  try {
    const p = (payload ?? {}) as GdprCustomerPayload;
    const { email, phone } = gdprCustomerIdentity(p);
    if (typeof p.shop_domain === "string" && p.shop_domain && p.shop_domain !== store.shop) {
      console.warn(`[Shopify GDPR] customer_redact shop mismatch: ${p.shop_domain} ≠ ${store.shop}`);
    }
    if (!phone) {
      console.log(`[Shopify GDPR] customer_redact — no phone to match (email=${email ?? "—"})`);
      const { notifyAdminShopifyGdpr } = await import("@/lib/notifications");
      await notifyAdminShopifyGdpr("customer_redact", store.shop, email ?? "—", "لا يوجد رقم هاتف للمطابقة التلقائية — يلزم مراجعة يدوية");
      return;
    }

    const [contacts, orders, carts] = await Promise.all([
      prisma.contact.updateMany({
        where: { userId, phone },
        data: { name: "[محذوف — GDPR]", notes: null },
      }),
      prisma.storeOrder.updateMany({
        where: { userId, shopifyStoreId: store.id, customerPhone: phone },
        data: { customerName: "[محذوف — GDPR]" },
      }),
      prisma.abandonedCart.deleteMany({
        where: { userId, shopifyStoreId: store.id, customerPhone: phone },
      }),
    ]);

    console.log(`[Shopify GDPR] customer_redact — shop=${store.shop} phone=${phone} | contacts=${contacts.count} orders=${orders.count} carts=${carts.count}`);
    const { notifyAdminShopifyGdpr } = await import("@/lib/notifications");
    await notifyAdminShopifyGdpr(
      "customer_redact", store.shop, phone,
      `إخفاء هوية: ${contacts.count} جهة اتصال، ${orders.count} أوردر — حذف: ${carts.count} سلة مهجورة`
    );
  } catch (error) {
    console.error("[Shopify GDPR] customer_redact error:", error);
  }
}

// ── shop/redact: مسح كل بيانات المتجر (بعد إلغاء التثبيت بـ48 ساعة) ──────────
// حذف فعلي للصفوف الخاصة بالمتجر فقط؛ بيانات CRM الواتساب المشتركة للتاجر
// (جهات الاتصال/المحادثات) لا تُمس — إلغاء تثبيت تطبيق شوبيفاي لا يبرر
// تدمير النظام التسويقي الكامل للتاجر.
export async function handleShopRedact(payload: unknown, userId: string, store: GdprStore) {
  try {
    const p = (payload ?? {}) as GdprShopPayload;
    if (typeof p.shop_domain === "string" && p.shop_domain && p.shop_domain !== store.shop) {
      console.warn(`[Shopify GDPR] shop_redact shop mismatch: ${p.shop_domain} ≠ ${store.shop}`);
    }

    const [carts, orders, automations] = await Promise.all([
      prisma.abandonedCart.deleteMany({ where: { shopifyStoreId: store.id } }),
      prisma.storeOrder.deleteMany({ where: { shopifyStoreId: store.id } }),
      prisma.storeAutomation.deleteMany({ where: { shopifyStoreId: store.id } }),
    ]);
    await prisma.shopifyStore.delete({ where: { id: store.id } }).catch((err) => {
      console.error("[Shopify GDPR] shop_redact store delete failed:", err);
    });

    console.log(`[Shopify GDPR] shop_redact — shop=${store.shop} | carts=${carts.count} orders=${orders.count} automations=${automations.count} store=deleted`);
    const { notifyAdminShopifyGdpr } = await import("@/lib/notifications");
    await notifyAdminShopifyGdpr(
      "shop_redact", store.shop, store.shop,
      `حذف: ${orders.count} أوردر، ${carts.count} سلة، ${automations.count} أتمتة + سجل الربط نفسه`
    );
  } catch (error) {
    console.error("[Shopify GDPR] shop_redact error:", error);
  }
}