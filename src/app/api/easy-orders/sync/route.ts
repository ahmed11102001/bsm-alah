// src/app/api/easy-orders/sync/route.ts
// ─── مزامنة طلبات EasyOrders بالـ API Key ─────────────────────────────────────
// يدعم:
//   1. تمرير apiKey مباشرة (أول مرة)
//   2. reuseStoredKey: true (من صفحة المتجر — يقرأ المفتاح من الـ DB)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { OrderSource }               from "@/types/enums";

const PAGE_SIZE = 100;

// ─── نوع أوردر EasyOrders ─────────────────────────────────────────────────────
interface EasyOrderItem {
  id:            string | number;
  order_number?: string | number;
  status?:       string;
  total?:        string | number;
  currency?:     string;
  customer?: {
    name?:        string;
    phone?:       string;
  };
  billing_address?: { phone?: string };
  phone?:           string;
  customer_phone?:  string;
  customer_name?:   string;
  created_at?:      string;
}

// ─── GET — حالة المزامنة الحالية ─────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: {
      id:              true,
      easyOrdersStore: {
        select: {
          storeName:   true,
          totalSynced: true,
          lastSyncAt:  true,
          isActive:    true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.easyOrdersStore) {
    return NextResponse.json({ connected: false });
  }

  const { storeName, totalSynced, lastSyncAt, isActive } = user.easyOrdersStore;

  return NextResponse.json({
    connected: true,
    storeName,
    totalSynced,
    lastSyncAt,
    isActive,
  });
}

// ─── POST — ربط المتجر وسحب الطلبات ─────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: {
      id:              true,
      easyOrdersStore: {
        select: {
          id:          true,
          apiKey:      true,
          storeName:   true,
          totalSynced: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: {
    apiKey?:          string;
    storeName?:       string;
    page?:            number;
    reuseStoredKey?:  boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeName, page = 1, reuseStoredKey = false } = body;

  // ── اختيار الـ API Key ───────────────────────────────────────────────────
  let apiKey: string;

  if (reuseStoredKey) {
    // يقرأ المفتاح المحفوظ من الـ DB (من صفحة المتجر)
    if (!user.easyOrdersStore?.apiKey) {
      return NextResponse.json(
        { error: "لا يوجد API Key محفوظ، يرجى ربط المتجر أولاً من صفحة API" },
        { status: 422 }
      );
    }
    apiKey = user.easyOrdersStore.apiKey;
  } else {
    // تمرير مباشر من صفحة API (أول ربط)
    if (!body.apiKey?.trim()) {
      return NextResponse.json({ error: "apiKey مطلوب" }, { status: 400 });
    }
    apiKey = body.apiKey.trim();
  }

  // ── حفظ / تحديث بيانات المتجر ───────────────────────────────────────────
  const store = await prisma.easyOrdersStore.upsert({
    where:  { userId: user.id },
    update: {
      apiKey,
      ...(storeName?.trim() ? { storeName: storeName.trim() } : {}),
    },
    create: {
      userId:        user.id,
      apiKey,
      storeName:     storeName?.trim() || "متجري",
      webhookSecret: apiKey, // نفس المفتاح كـ secret مبدئياً
    },
  });

  // ── جلب الطلبات من EasyOrders API ───────────────────────────────────────
  let orders: EasyOrderItem[] = [];

  try {
    const res = await fetch(
      `https://api.easyorders.io/api/v1/orders?per_page=${PAGE_SIZE}&page=${page}`,
      {
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept:         "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[EO-SYNC] API error:", res.status, errText.slice(0, 200));

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: "API Key غير صحيح أو منتهي الصلاحية" },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: `خطأ من EasyOrders API: ${res.status}` },
        { status: 502 }
      );
    }

    const data: unknown = await res.json();
    orders = Array.isArray(data)
      ? (data as EasyOrderItem[])
      : ((data as Record<string, unknown>)?.orders as EasyOrderItem[] ??
         (data as Record<string, unknown>)?.data  as EasyOrderItem[] ?? []);

  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : "Unknown error";
    console.error("[EO-SYNC] Fetch error:", msg);
    return NextResponse.json(
      { error: "تعذر الاتصال بـ EasyOrders API" },
      { status: 502 }
    );
  }

  if (!orders.length) {
    return NextResponse.json({
      success:  true,
      synced:   0,
      message:  "لا توجد طلبات في هذه الصفحة",
      hasMore:  false,
      nextPage: null,
    });
  }

  // ── حفظ كل أوردر ─────────────────────────────────────────────────────────
  let synced = 0;

  for (const order of orders) {
    const rawPhone: string =
      order?.customer?.phone          ??
      order?.billing_address?.phone   ??
      order?.phone                    ??
      order?.customer_phone           ??
      "";

    if (!rawPhone) continue;

    const phone = rawPhone.replace(/\D/g, "");
    if (phone.length < 9) continue;

    const name: string       = order?.customer?.name ?? order?.customer_name ?? "عميل";
    const externalId: string = String(order.id);
    const orderNumber        = String(order.order_number ?? order.id);
    const totalRaw           = parseFloat(String(order.total ?? "0"));
    const total              = isNaN(totalRaw) ? 0 : totalRaw;
    const currency           = order.currency ?? "EGP";
    const status             = order.status   ?? "pending";
    const orderedAt          = order.created_at ? new Date(order.created_at) : new Date();

    // ── Upsert Contact ──────────────────────────────────────────────────
    const contact = await prisma.contact.upsert({
      where:  { phone_userId: { phone, userId: user.id } },
      update: { name: name !== "عميل" ? name : undefined },
      create: { phone, userId: user.id, name },
    });

    // ── Upsert StoreOrder ───────────────────────────────────────────────
    await prisma.storeOrder.upsert({
      where: {
        source_externalId_userId: {
          source:     OrderSource.easyorders,
          externalId,
          userId:     user.id,
        },
      },
      update: { status, total },
      create: {
        userId:            user.id,
        source:            OrderSource.easyorders,
        externalId,
        orderNumber,
        customerName:      name,
        customerPhone:     phone,
        total,
        currency,
        status,
        rawData:           order as object,
        contactId:         contact.id,
        easyOrdersStoreId: store.id,
        orderedAt,
      },
    });

    synced++;
  }

  // ── تحديث عداد المزامنة ──────────────────────────────────────────────────
  const updated = await prisma.easyOrdersStore.update({
    where: { id: store.id },
    data:  {
      lastSyncAt:  new Date(),
      totalSynced: { increment: synced },
    },
    select: { totalSynced: true, storeName: true },
  });

  console.log(`[EO-SYNC] ✓ Synced ${synced} orders — user: ${user.id}`);

  return NextResponse.json({
    success:     true,
    synced,
    hasMore:     orders.length === PAGE_SIZE,
    nextPage:    orders.length === PAGE_SIZE ? page + 1 : null,
    storeName:   updated.storeName,
    totalSynced: updated.totalSynced,
  });
}
