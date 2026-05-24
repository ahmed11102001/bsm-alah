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
  handleShopifyCartAbandoned,
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
  monthlyPlanReset,
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
    handleShopifyCartAbandoned,
    handleEasyOrderReceived,
    handleWooOrderCreated,
    handleWooOrderFulfilled,
    handleWooOrderUpdated,
    // ── Automation Crons ──
    noReplyCron,
    timeBasedCron,
    // ── Plan Reset ──
    monthlyPlanReset,
  ],
});

export const GET  = inngestHandler.GET  as any;
export const POST = inngestHandler.POST as any;
export const PUT  = inngestHandler.PUT  as any;