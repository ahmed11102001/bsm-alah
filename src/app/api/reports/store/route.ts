// src/app/api/reports/store/route.ts
// ─── تقارير المتجر مع Revenue Attribution ────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";

function resolveUserId(session: any): string {
  const parent = (session.user as any).parentId as string | null;
  return parent ?? (session.user as any).id;
}

function dateRange(from?: string | null, to?: string | null) {
  const gte = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
  const lte = to   ? new Date(to)   : new Date();
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const userId = resolveUserId(session);
    const { searchParams } = new URL(req.url);
    const from  = searchParams.get("from");
    const to    = searchParams.get("to");
    const range = dateRange(from, to);

    // ── جلب معلومات المتاجر ──────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        shopifyStore:    { select: { id: true, shop: true, createdAt: true } },
        easyOrdersStore: { select: { id: true, storeName: true, isActive: true, lastSyncAt: true } },
        wooCommerceStore: { select: { id: true, storeName: true, isActive: true, lastSyncAt: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const sh = user.shopifyStore;
    const eo = user.easyOrdersStore;

    // ── Revenue Attribution per Campaign ─────────────────────────────
    const campaignRevenue = await prisma.campaign.findMany({
      where: {
        userId,
        revenue:     { gt: 0 },
        completedAt: { not: null },
        createdAt:   range,
      },
      select: {
        id:            true,
        name:          true,
        revenue:       true,
        ordersCount:   true,
        sentCount:     true,
        readCount:     true,
        completedAt:   true,
        createdAt:     true,
      },
      orderBy: { revenue: "desc" },
      take:    20,
    });

    // ── Top Customers by Spend ────────────────────────────────────────
    const topCustomers = await prisma.storeOrder.groupBy({
      by:      ["customerPhone", "customerName", "currency"],
      where:   { userId, orderedAt: range },
      _sum:    { total: true },
      _count:  { id: true },
      orderBy: { _sum: { total: "desc" } },
      take:    10,
    });

    // ── Orders by Status ─────────────────────────────────────────────
    const ordersByStatus = await prisma.storeOrder.groupBy({
      by:      ["status"],
      where:   { userId, orderedAt: range },
      _count:  { id: true },
      _sum:    { total: true },
    });

    // ── Daily Orders/Revenue trend ───────────────────────────────────
    const dailyOrdersRaw = await prisma.storeOrder.findMany({
      where:  { userId, orderedAt: range },
      select: { total: true, orderedAt: true, status: true },
      orderBy: { orderedAt: "asc" },
    });

    // Group by day
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of dailyOrdersRaw) {
      const day = o.orderedAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(day) ?? { orders: 0, revenue: 0 };
      cur.orders  += 1;
      cur.revenue += o.total ?? 0;
      dailyMap.set(day, cur);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // ── Total Summary ─────────────────────────────────────────────────
    const [totalOrders, totalRevenueAgg, totalCampaignRevAgg, totalUniqueCustomers] =
      await Promise.all([
        prisma.storeOrder.count({ where: { userId, orderedAt: range } }),

        prisma.storeOrder.aggregate({
          _sum:  { total: true },
          where: { userId, orderedAt: range },
        }),

        prisma.campaignOrder.aggregate({
          _sum:  { revenue: true },
          where: { storeOrder: { userId, orderedAt: range } },
        }),

        prisma.storeOrder
          .groupBy({ by: ["customerPhone"], where: { userId, orderedAt: range } })
          .then((r: any[]) => r.length),
      ]);

    const totalRevenue        = totalRevenueAgg._sum.total        ?? 0;
    const totalCampaignRev    = totalCampaignRevAgg._sum.revenue  ?? 0;
    const campaignRevenueShare = totalRevenue > 0
      ? Math.round((totalCampaignRev / totalRevenue) * 100)
      : 0;

    // ── Store info summary ────────────────────────────────────────────
    const woo = (user as any).wooCommerceStore as { id: string; storeName: string; isActive: boolean; lastSyncAt: Date | null } | null;
    const stores = [];
    if (sh)  stores.push({ source: "shopify",     name: sh.shop,       connectedAt: sh.createdAt,          isActive: true });
    if (eo)  stores.push({ source: "easyorders",  name: eo.storeName,  connectedAt: eo.lastSyncAt ?? null, isActive: eo.isActive });
    if (woo) stores.push({ source: "woocommerce", name: woo.storeName, connectedAt: woo.lastSyncAt ?? null, isActive: woo.isActive });

    return NextResponse.json({
      summary: {
        totalOrders,
        totalRevenue,
        totalCampaignRevenue:  totalCampaignRev,
        campaignRevenueShare,
        totalUniqueCustomers,
        storesConnected: stores.length,
      },
      stores,
      campaignRevenue,
      topCustomers: topCustomers.map((c: any) => ({
        phone:       c.customerPhone,
        name:        c.customerName ?? null,
        ordersCount: c._count.id,
        totalSpent:  c._sum.total ?? 0,
        currency:    c.currency,
      })),
      ordersByStatus: ordersByStatus.map((s: any) => ({
        status:  s.status,
        count:   s._count.id,
        revenue: s._sum.total ?? 0,
      })),
      dailyTrend,
    });
  } catch (err) {
    console.error("store-reports error:", err);
    return NextResponse.json({ error: "خطأ في السيرفر" }, { status: 500 });
  }
}