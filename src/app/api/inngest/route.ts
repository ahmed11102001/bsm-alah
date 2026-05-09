// src/app/api/inngest/route.ts
// ─── Inngest Handler ──────────────────────────────────────────────────────────
// ده الباب اللي Inngest بيكلم مشروعك من خلاله
// لازم يكون accessible (مش محمي بـ auth)

import { serve }            from "inngest/next";
import { inngest }          from "@/inngest/client";
import { processCampaign, sendDirectMessage } from "@/inngest/functions";
import {
  handleShopifyOrderCreated,
  handleShopifyOrderFulfilled,
  handleShopifyOrderUpdated,
} from "@/inngest/shopify-functions";
import { handleEasyOrderReceived } from "@/inngest/easy-orders-functions";
import {
  noReplyCron,
  timeBasedCron,
} from "@/inngest/automation-cron-functions";

const inngestHandler = serve({
  client:    inngest,
  functions: [
    processCampaign,
    sendDirectMessage,
    handleShopifyOrderCreated,
    handleShopifyOrderFulfilled,
    handleShopifyOrderUpdated,
    handleEasyOrderReceived,
    // ── Automation Crons ──
    noReplyCron,
    timeBasedCron,
  ],
});

export const GET  = inngestHandler.GET  as any;
export const POST = inngestHandler.POST as any;
export const PUT  = inngestHandler.PUT  as any;