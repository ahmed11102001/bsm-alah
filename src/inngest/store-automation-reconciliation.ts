import { inngest } from "./client";
import prisma from "@/lib/prisma";

const CLAIM_TTL_MS = 5 * 60 * 1000;

/**
 * Finds claims that survived the sender process. We intentionally do not
 * release/retry them automatically: WhatsApp may have accepted the request
 * immediately before a process crash, and blind recovery would create a
 * duplicate message. The records are returned and logged for safe review.
 */
export const reconcileStoreAutomationClaims = inngest.createFunction(
  {
    id: "reconcile-store-automation-claims",
    retries: 1,
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }: { step: any }) => {
    const cutoff = new Date(Date.now() - CLAIM_TTL_MS);

    const stale = await step.run("find-stale-store-automation-claims", async () => {
      const [orders, carts] = await Promise.all([
        prisma.storeOrder.findMany({
          where: {
            OR: [
              { confirmationClaimedAt: { lt: cutoff }, confirmationMessageId: null },
              { shippedAt: { lt: cutoff }, shippedMessageId: null },
            ],
          },
          select: { id: true, confirmationClaimedAt: true, shippedAt: true },
          take: 100,
        }),
        prisma.abandonedCart.findMany({
          where: { sendClaimedAt: { lt: cutoff }, sentAt: null },
          select: { id: true, sendClaimedAt: true },
          take: 100,
        }),
      ]);

      return { orders, carts };
    });

    if (stale.orders.length || stale.carts.length) {
      console.error("[StoreAuto] Stale claims require review; no automatic retry performed", {
        orderIds: stale.orders.map((order: { id: string }) => order.id),
        cartIds: stale.carts.map((cart: { id: string }) => cart.id),
      });
    }

    return {
      staleOrders: stale.orders.length,
      staleCarts: stale.carts.length,
      automaticRetries: 0,
    };
  },
);
