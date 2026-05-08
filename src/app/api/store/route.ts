// src/app/api/store/route.ts
// ─── إحصائيات المتاجر المربوطة (Shopify + EasyOrders) ────────────────────────

import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import prisma               from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: {
      id: true,
      shopifyStore: {
        select: {
          id:        true,
          shop:      true,
          createdAt: true,
          _count:    { select: { orders: true } },
        },
      },
      easyOrdersStore: {
        select: {
          id:          true,
          storeName:   true,
          isActive:    true,
          lastSyncAt:  true,
          totalSynced: true,
          createdAt:   true,
          _count:      { select: { orders: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sh = user.shopifyStore;
  const eo = user.easyOrdersStore;

  // ── إحصائيات موازية ──────────────────────────────────────────────────────
  const [shCustomers, eoCustomers, shRevenue, eoRevenue] = await Promise.all([

    sh
      ? prisma.storeOrder
          .groupBy({ by: ["customerPhone"], where: { shopifyStoreId: sh.id } })
          .then((r) => r.length)
      : Promise.resolve(0),

    eo
      ? prisma.storeOrder
          .groupBy({ by: ["customerPhone"], where: { easyOrdersStoreId: eo.id } })
          .then((r) => r.length)
      : Promise.resolve(0),

    sh
      ? prisma.campaignOrder
          .aggregate({
            _sum:  { revenue: true },
            where: { storeOrder: { shopifyStoreId: sh.id } },
          })
          .then((r) => r._sum.revenue ?? 0)
      : Promise.resolve(0),

    eo
      ? prisma.campaignOrder
          .aggregate({
            _sum:  { revenue: true },
            where: { storeOrder: { easyOrdersStoreId: eo.id } },
          })
          .then((r) => r._sum.revenue ?? 0)
      : Promise.resolve(0),
  ]);

  return NextResponse.json({
    shopify: sh
      ? {
          id:              sh.id,
          storeName:       sh.shop,
          source:          "shopify" as const,
          totalOrders:     sh._count.orders,
          totalCustomers:  shCustomers,
          campaignRevenue: shRevenue,
          connectedAt:     sh.createdAt,
        }
      : null,

    easyorders: eo
      ? {
          id:              eo.id,
          storeName:       eo.storeName,
          source:          "easyorders" as const,
          isActive:        eo.isActive,
          lastSyncAt:      eo.lastSyncAt,
          totalSynced:     eo.totalSynced,
          totalOrders:     eo._count.orders,
          totalCustomers:  eoCustomers,
          campaignRevenue: eoRevenue,
          connectedAt:     eo.createdAt,
        }
      : null,
  });
}