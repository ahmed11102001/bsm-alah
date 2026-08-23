// src/app/api/inngest/route.ts
// ─── Inngest Handler ──────────────────────────────────────────────────────────
// ده الباب اللي Inngest بيكلم مشروعك من خلاله
// لازم يكون accessible (مش محمي بـ auth)

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processCampaign, sendDirectMessage, processQueueItem, handleNewLeadBot, processDelayedStoreAutomation } from "@/inngest/functions";
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
  timeBasedCron,
  usageCountersResetDaily,
  expireSubscriptionsDaily,
  subscriptionExpiryWarning,
  ownerPlanRenewalCheck,
  whatsappTokenExpiryCheck,
  aiTokensLowCheck,
} from "@/inngest/automation-cron-functions";
import {
  scheduleShippingFollowUpFn,
  scheduleCartFollowUpFn,
  sendFollowUpActionFn,
  scheduleCampaignFollowUpFn,
  sendCampaignFollowUpMsgFn,
  campaignFollowUpActionFn,
} from "@/inngest/smart-followup-functions";

import {
  productSyncCron,
  productSyncOnDemand,
} from "@/inngest/product-sync-functions";
import { websiteCrawlOnDemand } from "@/inngest/website-crawl-functions";
import { reconcileStoreAutomationClaims } from "@/inngest/store-automation-reconciliation";
import { conversationNudgeFn } from "@/inngest/conversation-nudge-functions";
import { aiReplyDebounceFn } from "@/inngest/ai-reply-debounce-functions";
import { googleSheetsSyncCron } from "@/inngest/google-sheets-functions";

const inngestHandler = serve({
  client: inngest,
  functions: [
    aiReplyDebounceFn,
    processCampaign,
    sendDirectMessage,
    processQueueItem,
    handleNewLeadBot,
    processDelayedStoreAutomation,
    reconcileStoreAutomationClaims,
    handleShopifyOrderCreated,
    handleShopifyOrderFulfilled,
    handleShopifyOrderUpdated,
    handleShopifyCartAbandoned,
    handleEasyOrderReceived,
    handleWooOrderCreated,
    handleWooOrderFulfilled,
    handleWooOrderUpdated,
    // ── Automation Crons ──
    timeBasedCron,
    subscriptionExpiryWarning,
    whatsappTokenExpiryCheck,
    aiTokensLowCheck,
    productSyncCron,
    productSyncOnDemand,
    websiteCrawlOnDemand,
    // ── Plan Reset ──
    expireSubscriptionsDaily,
    usageCountersResetDaily,
    // ── Smart Follow-Up ──
    scheduleShippingFollowUpFn,
    scheduleCartFollowUpFn,
    sendFollowUpActionFn,
    scheduleCampaignFollowUpFn,
    sendCampaignFollowUpMsgFn,
    campaignFollowUpActionFn,
    // ── Conversation Nudge ──
    conversationNudgeFn,
    googleSheetsSyncCron,
  ],
});

export const GET = inngestHandler.GET as any;
export const POST = inngestHandler.POST as any;
export const PUT = inngestHandler.PUT as any;
