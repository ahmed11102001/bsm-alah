// src/app/api/store/orders/route.ts
// ─── طلبات المتجر مجمّعة حسب العميل مع pagination وبحث ──────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";

const PAGE_SIZE = 20;

// ── أعضاء الفريق يشاركون متجر الـ owner ─────────────────────────────────────
function resolveOwnerId(session: any): string {
  return (session.user.parentId as string | null) ?? (session.user.id as string);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerId = resolveOwnerId(session);

  const user = await prisma.user.findUnique({
    where:  { id: ownerId },
    select: {
      id:               true,
      shopifyStore:     { select: { id: true } },
      easyOrdersStore:  { select: { id: true } },
      wooCommerceStore: { select: { id: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sp     = new URL(req.url).searchParams;
  const source = sp.get("source");
  const page   = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const search = sp.get("search")?.trim() ?? "";

  if (!source || !["shopify", "easyorders", "woocommerce"].includes(source)) {
    return NextResponse.json(
      { error: "source مطلوب: shopify أو easyorders أو woocommerce" },
      { status: 400 }
    );
  }

  // ── الـ where الأساسي باستخدام storeId مش source string ─────────────────
  const storeFilter: Record<string, string> =
    source === "shopify"
      ? { shopifyStoreId: user.shopifyStore?.id ?? "" }
      : source === "easyorders"
        ? { easyOrdersStoreId: user.easyOrdersStore?.id ?? "" }
        : { wooCommerceStoreId: (user as any).wooCommerceStore?.id ?? "" };

  const storeId =
    source === "shopify"     ? user.shopifyStore?.id :
    source === "easyorders"  ? user.easyOrdersStore?.id :
                                (user as any).wooCommerceStore?.id;

  if (!storeId) {
    return NextResponse.json(
      { error: "المتجر غير مربوط", customers: [], total: 0, page: 1, hasMore: false },
      { status: 200 }
    );
  }

  // ── شرط البحث ─────────────────────────────────────────────────────────────
  const searchFilter = search
    ? {
        OR: [
          { customerName:  { contains: search, mode: "insensitive" as const } },
          { customerPhone: { contains: search } },
          { orderNumber:   { contains: search } },
        ],
      }
    : {};

  const where = { ...storeFilter, ...searchFilter };

  // ── تجميع حسب الهاتف ──────────────────────────────────────────────────────
  const [rawGroups, totalCustomers] = await Promise.all([
    prisma.storeOrder.groupBy({
      by:      ["customerPhone"],
      where,
      _count:  { id: true },
      _sum:    { total: true },
      _max:    { orderedAt: true },
      orderBy: { _max: { orderedAt: "desc" } },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
    }),
    prisma.storeOrder
      .groupBy({ by: ["customerPhone"], where, _count: { id: true } })
      .then((r: any[]) => r.length),
  ]);

  if (rawGroups.length === 0) {
    return NextResponse.json({ customers: [], total: totalCustomers, page, hasMore: false });
  }

  const phones = rawGroups.map((c: any) => c.customerPhone);

  // ── آخر أوردر لكل عميل ───────────────────────────────────────────────────
  const lastOrders: any[] = await prisma.storeOrder.findMany({
    where:    { ...(storeFilter as any), customerPhone: { in: phones } },
    orderBy:  { orderedAt: "desc" },
    distinct: ["customerPhone"],
    select: {
      customerPhone: true,
      customerName:  true,
      orderNumber:   true,
      total:         true,
      currency:      true,
      status:        true,
      orderedAt:     true,
    },
  });

  const lastMap = new Map(lastOrders.map((o: any) => [o.customerPhone, o]));

  const customers = rawGroups.map((c: any) => {
    const last = lastMap.get(c.customerPhone);
    return {
      phone:       c.customerPhone,
      name:        last?.customerName ?? "عميل",
      ordersCount: c._count.id,
      totalSpent:  c._sum.total ?? 0,
      currency:    last?.currency ?? "EGP",
      lastOrder: last
        ? {
            orderNumber: last.orderNumber,
            total:       last.total,
            status:      last.status,
            orderedAt:   last.orderedAt.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({
    customers,
    total:   totalCustomers,
    page,
    hasMore: page * PAGE_SIZE < totalCustomers,
  });
}