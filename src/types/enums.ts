/**
 * src/types/enums.ts
 *
 * Enum values that mirror the Prisma schema exactly.
 * Import from here instead of "@prisma/client" for any enum that
 * TypeScript can't find in the generated client.
 *
 * These are plain objects (const enums) so they work at both
 * type-level and runtime — e.g. MessageDirection.inbound === "inbound".
 */

export const MessageType = {
  text:     "text",
  image:    "image",
  document: "document",
  audio:    "audio",
  template: "template",
  video:    "video",
  sticker:  "sticker",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageStatus = {
  pending:   "pending",
  sent:      "sent",
  delivered: "delivered",
  read:      "read",
  failed:    "failed",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const MessageDirection = {
  inbound:  "inbound",
  outbound: "outbound",
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageSenderType = {
  human:  "human",
  ai:     "ai",
  bot:    "bot",
  system: "system",
} as const;
export type MessageSenderType = (typeof MessageSenderType)[keyof typeof MessageSenderType];

export const CampaignStatus = {
  draft:     "draft",
  scheduled: "scheduled",
  running:   "running",
  completed: "completed",
  failed:    "failed",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const QueueStatus = {
  pending:    "pending",
  processing: "processing",
  sent:       "sent",
  failed:     "failed",
  cancelled:  "cancelled",
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

export const UserRole = {
  OWNER:       "OWNER",
  FULL_ACCESS: "FULL_ACCESS",
  CHAT_ONLY:   "CHAT_ONLY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PlanTier = {
  free:       "free",
  starter:    "starter",
  pro:        "pro",
  enterprise: "enterprise",
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const SubscriptionStatus = {
  active:    "active",
  expired:   "expired",
  cancelled: "cancelled",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const NotificationType = {
  CAMPAIGN_SUCCESS:        "CAMPAIGN_SUCCESS",
  CAMPAIGN_FAILED:         "CAMPAIGN_FAILED",
  CAMPAIGN_PARTIAL:        "CAMPAIGN_PARTIAL",
  PLAN_LIMIT_REACHED:      "PLAN_LIMIT_REACHED",
  NEW_MESSAGE:             "NEW_MESSAGE",
  STORE_AUTO_SENT:         "STORE_AUTO_SENT",
  STORE_AUTO_FAILED:       "STORE_AUTO_FAILED",
  SUBSCRIPTION_EXPIRING:   "SUBSCRIPTION_EXPIRING",
  PAYMENT_FAILED:          "PAYMENT_FAILED",
  WHATSAPP_TOKEN_EXPIRING: "WHATSAPP_TOKEN_EXPIRING",
  AI_TOKENS_LOW:           "AI_TOKENS_LOW",
  SUBSCRIPTION_SUCCESS:    "SUBSCRIPTION_SUCCESS",
  ORDER_CONFIRMED:         "ORDER_CONFIRMED",
  ORDER_CANCELLED:         "ORDER_CANCELLED",
  AI_HANDOFF_NEEDED:       "AI_HANDOFF_NEEDED",
  SMART_FOLLOWUP_ALERT:    "SMART_FOLLOWUP_ALERT",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ConversationStatus = {
  AUTO: "AUTO",
  NEEDS_HUMAN: "NEEDS_HUMAN",
  HUMAN_ACTIVE: "HUMAN_ACTIVE",
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const StoreType = {
  shopify:     "shopify",
  easyorders:  "easyorders",
  woocommerce: "woocommerce",
} as const;
export type StoreType = (typeof StoreType)[keyof typeof StoreType];

export const StoreAutomationType = {
  order_confirm: "order_confirm",
  order_shipped: "order_shipped",
  promo:         "promo",
} as const;
export type StoreAutomationType = (typeof StoreAutomationType)[keyof typeof StoreAutomationType];

export const OrderSource = {
  shopify:     "shopify",
  easyorders:  "easyorders",
  woocommerce: "woocommerce",
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const TriggerType = {
  KEYWORD:       "KEYWORD",
  FIRST_MESSAGE: "FIRST_MESSAGE",
  NO_REPLY:      "NO_REPLY",
  TIME_BASED:    "TIME_BASED",
} as const;
export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType];

export const ReplyType = {
  TEXT:     "TEXT",
  TEMPLATE: "TEMPLATE",
  AI:       "AI",
} as const;
export type ReplyType = (typeof ReplyType)[keyof typeof ReplyType];

export const AIProvider = {
  gemini: "gemini",
  openai: "openai",
} as const;
export type AIProvider = (typeof AIProvider)[keyof typeof AIProvider];

// Smart follow-up enums (mirror Prisma schema)
export const SmartFollowUpType = {
  shipping: "shipping",
  cart:     "cart",
} as const;
export type SmartFollowUpType = (typeof SmartFollowUpType)[keyof typeof SmartFollowUpType];

export const ShippingFollowUpStage = {
  SENT:                  "SENT",
  AWAITING_RATING:       "AWAITING_RATING",
  AWAITING_PROBLEM_DETAILS: "AWAITING_PROBLEM_DETAILS",
  DONE:                  "DONE",
} as const;
export type ShippingFollowUpStage = (typeof ShippingFollowUpStage)[keyof typeof ShippingFollowUpStage];

export const CartFollowUpStage = {
  SENT:           "SENT",
  AWAITING_REASON: "AWAITING_REASON",
  DONE:           "DONE",
} as const;
export type CartFollowUpStage = (typeof CartFollowUpStage)[keyof typeof CartFollowUpStage];