// src/app/api/inngest/route.ts
// ─── Inngest Handler ──────────────────────────────────────────────────────────
// ده الباب اللي Inngest بيكلم مشروعك من خلاله
// لازم يكون accessible (مش محمي بـ auth)

import { serve }            from "inngest/next";
import { inngest }          from "@/inngest/client";
import { processCampaign, sendDirectMessage, processQueueItem } from "@/inngest/functions";
import {
  handleShopifyOrderCreated,
  handleShopifyOrderFulfilled,
  handleShopifyOrderUpdated,
} from "@/inngest/shopify-functions";
import { handleEasyOrderReceived } from "@/inngest/easy-orders-functions";
import {
  handleWooOrderCreated,
  handleWooOrderFulfilled,
  handleWooOrderUpdated,
} from "@/inngest/woocommerce-functions";
import {
  noReplyCron,
  timeBasedCron,
} from "@/inngest/automation-cron-functions";

const inngestHandler = serve({
  client:    inngest,
  functions: [
    processCampaign,
    sendDirectMessage,
    processQueueItem,
    handleShopifyOrderCreated,
    handleShopifyOrderFulfilled,
    handleShopifyOrderUpdated,
    handleEasyOrderReceived,
    handleWooOrderCreated,
    handleWooOrderFulfilled,
    handleWooOrderUpdated,
    // ── Automation Crons ──
    noReplyCron,
    timeBasedCron,
  ],
});

export const GET  = inngestHandler.GET  as any;
export const POST = inngestHandler.POST as any;
export const PUT  = inngestHandler.PUT  as any;