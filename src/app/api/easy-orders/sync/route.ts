// src/app/api/easy-orders/sync/route.ts
// ─── سحب طلبات EasyOrders باستخدام API Key (المزامنة اليدوية) ────────────────
// يسحب آخر 100 طلب ويحفظهم في StoreOrder + Contact

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── نوع بيانات الأوردر من EasyOrders API ────────────────────────────────────
interface EasyOrderItem {
  id:            string | number;
  order_number?: string | number;
  status?:       string;
  total?:        string | number;
  currency?:     string;
  customer?: {
    name?:  string;
    phone?: string;
    email?: string;
  };
  billing_address?: { phone?: string };
  phone?:           string;
  customer_phone?:  string;
  customer_name?:   string;
  created_at?:      string;
}

// ─── POST — ربط المتجر + مزامنة أول 100 طلب ─────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { apiKey?: string; storeName?: string; page?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { apiKey, storeName, page = 1 } = body;

  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: "apiKey مطلوب" }, { status: 400 });
  }

  // ── 1: حفظ/تحديث بيانات المتجر ──────────────────────────────────────────
  const store = await prisma.easyOrdersStore.upsert({
    where:  { userId: user.id },
    update: { apiKey: apiKey.trim(), storeName: storeName?.trim() || "متجري" },
    create: {
      userId:        user.id,
      apiKey:        apiKey.trim(),
      storeName:     storeName?.trim() || "متجري",
      webhookSecret: apiKey.trim(), // نفس الـ API Key كـ secret مبدئياً
    },
  });

  // ── 2: جلب الطلبات من EasyOrders API ─────────────────────────────────────
  // EasyOrders API: GET /api/v1/orders?api_key=xxx&per_page=100&page=N
  const EASY_ORDERS_API = "https://api.easyorders.io";
  let orders: EasyOrderItem[] = [];

  try {
    const res = await fetch(
      `${EASY_ORDERS_API}/api/v1/orders?per_page=100&page=${page}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type":  "application/json",
          "Accept":        "application/json",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[EO-SYNC] API error:", res.status, errText.slice(0, 200));

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "API Key غير صحيح أو منتهي الصلاحية" },
          { status: 422 }
        );
      }

      return NextResponse.json(
        { error: `خطأ من EasyOrders: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    // EasyOrders بيرجع { orders: [...] } أو مصفوفة مباشرة
    orders = Array.isArray(data) ? data : (data?.orders ?? data?.data ?? []);

  } catch (fetchErr) {
    console.error("[EO-SYNC] Fetch error:", fetchErr);
    return NextResponse.json(
      { error: "تعذر الاتصال بـ EasyOrders API" },
      { status: 502 }
    );
  }

  if (!orders.length) {
    return NextResponse.json({
      success:  true,
      synced:   0,
      message:  "لا توجد طلبات جديدة في هذه الصفحة",
      hasMore:  false,
    });
  }

  // ── 3: حفظ كل أوردر ──────────────────────────────────────────────────────
  let synced = 0;

  for (const order of orders) {
    const rawPhone =
      order?.customer?.phone    ??
      order?.billing_address?.phone ??
      order?.phone              ??
      order?.customer_phone     ??
      "";

    const name =
      order?.customer?.name  ??
      order?.customer_name   ??
      "عميل";

    const externalId  = String(order.id);
    const orderNumber = String(order.order_number ?? order.id);
    const total       = String(order.total ?? "");
    const currency    = order.currency ?? "EGP";
    const status      = order.status   ?? "pending";

    if (!rawPhone) continue;
    const phone = rawPhone.replace(/\D/g, "");
    if (phone.length < 9) continue;

    // Upsert Contact
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone, userId: user.id } },
      update: { name: name !== "عميل" ? name : undefined },
      create: { phone, userId: user.id, name },
    });

    // Upsert StoreOrder
    await prisma.storeOrder.upsert({
      where: {
        userId_source_externalId: {
          userId: user.id,
          source: "easyorders",
          externalId,
        },
      },
      update: { status },
      create: {
        userId:        user.id,
        source:        "easyorders",
        externalId,
        orderNumber,
        customerName:  name,
        customerPhone: phone,
        total,
        currency,
        status,
        rawData:       order as any,
        contactId:     contact.id,
      },
    });

    synced++;
  }

  // ── 4: تحديث عداد المزامنة ───────────────────────────────────────────────
  await prisma.easyOrdersStore.update({
    where: { userId: user.id },
    data:  {
      lastSyncAt:  new Date(),
      totalSynced: { increment: synced },
    },
  });

  console.log(`[EO-SYNC] ✓ Synced ${synced} orders for user ${user.id}`);

  return NextResponse.json({
    success:    true,
    synced,
    hasMore:    orders.length === 100, // لو جاب 100 يعني في المزيد
    nextPage:   orders.length === 100 ? page + 1 : null,
    storeName:  store.storeName,
    totalSynced: store.totalSynced + synced,
  });
}

// ─── GET — جلب حالة المزامنة الحالية ─────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, easyOrdersStore: true },
  });

  if (!user?.easyOrdersStore) {
    return NextResponse.json({ connected: false });
  }

  const { storeName, totalSynced, lastSyncAt, isActive } = user.easyOrdersStore;

  return NextResponse.json({
    connected:   true,
    storeName,
    totalSynced,
    lastSyncAt,
    isActive,
  });
}
