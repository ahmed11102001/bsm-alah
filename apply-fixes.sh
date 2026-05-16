#!/usr/bin/env bash
# =============================================================================
# WhatsPro — TypeScript Fix Script
# تشغيل: bash apply-fixes.sh (من داخل مجلد المشروع)
# =============================================================================
set -e

echo "🔧 [1/4] إنشاء ملف src/types/enums.ts ..."
mkdir -p src/types
cat > src/types/enums.ts << 'ENUMS_EOF'
/**
 * src/types/enums.ts
 * Enum values mirroring the Prisma schema exactly.
 * Import from here instead of "@prisma/client" for any missing enum.
 */
export const MessageType = {
  text: "text", image: "image", document: "document",
  audio: "audio", template: "template",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageStatus = {
  pending: "pending", sent: "sent", delivered: "delivered",
  read: "read", failed: "failed",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const MessageDirection = {
  inbound: "inbound", outbound: "outbound",
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const CampaignStatus = {
  draft: "draft", scheduled: "scheduled", running: "running",
  completed: "completed", failed: "failed",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const QueueStatus = {
  pending: "pending", processing: "processing", sent: "sent",
  failed: "failed", cancelled: "cancelled",
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

export const UserRole = {
  OWNER: "OWNER", FULL_ACCESS: "FULL_ACCESS", CHAT_ONLY: "CHAT_ONLY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PlanTier = {
  free: "free", starter: "starter", pro: "pro", enterprise: "enterprise",
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

export const SubscriptionStatus = {
  active: "active", expired: "expired", cancelled: "cancelled",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const NotificationType = {
  CAMPAIGN_SUCCESS: "CAMPAIGN_SUCCESS", CAMPAIGN_FAILED: "CAMPAIGN_FAILED",
  CAMPAIGN_PARTIAL: "CAMPAIGN_PARTIAL", PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  NEW_MESSAGE: "NEW_MESSAGE",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const StoreType = {
  shopify: "shopify", easyorders: "easyorders", woocommerce: "woocommerce",
} as const;
export type StoreType = (typeof StoreType)[keyof typeof StoreType];

export const StoreAutomationType = {
  order_confirm: "order_confirm", order_shipped: "order_shipped", promo: "promo",
} as const;
export type StoreAutomationType = (typeof StoreAutomationType)[keyof typeof StoreAutomationType];

export const OrderSource = {
  shopify: "shopify", easyorders: "easyorders", woocommerce: "woocommerce",
} as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const TriggerType = {
  KEYWORD: "KEYWORD", FIRST_MESSAGE: "FIRST_MESSAGE",
  NO_REPLY: "NO_REPLY", TIME_BASED: "TIME_BASED",
} as const;
export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType];

export const ReplyType = {
  TEXT: "TEXT", TEMPLATE: "TEMPLATE", AI: "AI",
} as const;
export type ReplyType = (typeof ReplyType)[keyof typeof ReplyType];

export const AIProvider = {
  gemini: "gemini", openai: "openai",
} as const;
export type AIProvider = (typeof AIProvider)[keyof typeof AIProvider];
ENUMS_EOF

echo "✅  src/types/enums.ts created"

echo ""
echo "🔧 [2/4] إصلاح الـ imports في الملفات المتأثرة ..."

FILES_TO_FIX=(
  "src/app/api/webhook/route.ts"
  "src/app/api/campaigns/route.ts"
  "src/app/api/chat/route.ts"
  "src/app/api/audiences/route.ts"
  "src/app/api/dashboard/route.ts"
  "src/app/api/reports/route.ts"
  "src/app/api/automation/route.ts"
  "src/app/api/ai-agent/route.ts"
  "src/app/api/easy-orders/sync/route.ts"
  "src/lib/queue.ts"
  "src/lib/notifications.ts"
  "src/components/dashboard/NotificationBell.tsx"
)

for f in "${FILES_TO_FIX[@]}"; do
  if [ -f "$f" ]; then
    sed -i 's|from "@prisma/client"|from "@/types/enums"|g' "$f"
    echo "   ✔  $f"
  fi
done

# db-utils special case — keep Prisma namespace, only remove enum imports
sed -i 's|import { Prisma, CampaignStatus } from "@prisma/client";|import { Prisma } from "@prisma/client";\nimport { CampaignStatus } from "@/types/enums";|g' src/lib/db-utils.ts
echo "   ✔  src/lib/db-utils.ts"

echo ""
echo "🔧 [3/4] تشغيل prisma generate ..."
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate --schema=./prisma/schema.prisma
echo "✅  Prisma client generated"

echo ""
echo "🔧 [4/4] فحص TypeScript ..."
npx tsc --noEmit
echo "✅  TypeScript — صفر errors"

echo ""
echo "🎉 تم! المشروع جاهز. شغّل الآن:"
echo "   cp .env.example .env.local"
echo "   # اعبي المتغيرات في .env.local"
echo "   npx prisma migrate dev"
echo "   npm run dev"