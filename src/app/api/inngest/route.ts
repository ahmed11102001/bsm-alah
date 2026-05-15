// src/app/api/inngest/route.ts
import { serve }            from "inngest/next";
import { inngest }          from "@/inngest/client";
import { processCampaign, sendDirectMessage } from "@/inngest/functions";
import {
  handleShopifyOrderCreated,
  handleShopifyOrderFulfilled,
  handleShopifyOrderUpdated,
} from "@/inngest/shopify-functions";
import { handleEasyOrderReceived }  from "@/inngest/easy-orders-functions";
import { handleWooOrderReceived }   from "@/inngest/woocommerce-functions";
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
    handleWooOrderReceived,
    noReplyCron,
    timeBasedCron,
  ],
});

export const GET  = inngestHandler.GET  as any;
export const POST = inngestHandler.POST as any;
export const PUT  = inngestHandler.PUT  as any;