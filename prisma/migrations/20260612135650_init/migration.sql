-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'document', 'audio', 'template', 'video', 'sticker');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('human', 'ai', 'bot', 'system');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'FULL_ACCESS', 'CHAT_ONLY');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('pending', 'processing', 'sent', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CAMPAIGN_SUCCESS', 'CAMPAIGN_FAILED', 'CAMPAIGN_PARTIAL', 'PLAN_LIMIT_REACHED', 'NEW_MESSAGE', 'STORE_AUTO_SENT', 'STORE_AUTO_FAILED');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('shopify', 'easyorders', 'woocommerce');

-- CreateEnum
CREATE TYPE "StoreAutomationType" AS ENUM ('order_confirm', 'order_shipped', 'promo', 'cart_abandon');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('shopify', 'easyorders', 'woocommerce');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('KEYWORD', 'FIRST_MESSAGE', 'NO_REPLY', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "ReplyType" AS ENUM ('TEXT', 'TEMPLATE', 'AI');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('gemini', 'openai');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('AUTHENTICATION', 'UTILITY', 'MARKETING');

-- CreateEnum
CREATE TYPE "DeveloperStatus" AS ENUM ('PENDING_META', 'ACTIVE', 'SUSPENDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "DeveloperTemplateStatus" AS ENUM ('LOCAL_DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "DeveloperApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "OtpLogStatus" AS ENUM ('PENDING', 'SENT', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "inviteCode" TEXT,
    "parentId" TEXT,
    "workspaceId" TEXT,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "brandName" TEXT,
    "businessDesc" TEXT,
    "productsInfo" TEXT,
    "pricingInfo" TEXT,
    "workingHours" TEXT,
    "aiTone" TEXT NOT NULL DEFAULT 'friendly',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'free',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "isBetaUser" BOOLEAN NOT NULL DEFAULT false,
    "campaignsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "mcpCommandsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "periodResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiTokensUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "aiTokensBonusBalance" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "backoffCount" INTEGER NOT NULL DEFAULT 0,
    "backoffUntil" TIMESTAMP(3),
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailySentCount" INTEGER NOT NULL DEFAULT 0,
    "messagingTier" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappAccountId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "contactId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'template',
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'ar',
    "templateVars" JSONB,
    "content" TEXT,
    "campaignId" TEXT,
    "status" "QueueStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "whatsappMsgId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "existingMessageId" TEXT,

    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'excel',

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "audienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "notes" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voiceAgentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastAiRepliedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "language" TEXT NOT NULL DEFAULT 'ar',
    "headerType" TEXT,
    "headerText" TEXT,
    "footer" TEXT,
    "buttons" JSONB,
    "rejectedReason" TEXT,
    "components" JSONB,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "totalQueued" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trackedUrl" TEXT,
    "attributionHours" INTEGER NOT NULL DEFAULT 48,
    "templateVariables" JSONB,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "contactId" TEXT NOT NULL,
    "whatsappId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "mediaUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'pending',
    "direction" "MessageDirection" NOT NULL DEFAULT 'outbound',
    "senderType" "MessageSenderType" NOT NULL DEFAULT 'human',
    "reactions" JSONB DEFAULT '[]',

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "forPlan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyStore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "accessToken" TEXT,
    "scope" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EasyOrdersStore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "totalSynced" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EasyOrdersStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WooCommerceStore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSynced" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WooCommerceStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "TriggerType" NOT NULL,
    "triggerValue" TEXT,
    "replyType" "ReplyType" NOT NULL,
    "replyContent" TEXT,
    "replyMediaUrl" TEXT,
    "templateId" TEXT,
    "extraInstructions" TEXT,
    "humanKeywords" TEXT[],
    "pauseOnReply" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" "AIProvider" NOT NULL DEFAULT 'gemini',
    "brandName" TEXT,
    "businessDesc" TEXT,
    "productsInfo" TEXT,
    "pricingInfo" TEXT,
    "workingHours" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "systemPrompt" TEXT,
    "pauseMinutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "elevenLabsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "elevenLabsApiKey" TEXT,
    "elevenLabsAgentId" TEXT,

    CONSTRAINT "AIAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawData" JSONB,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "easyOrdersStoreId" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopifyStoreId" TEXT,
    "wooCommerceStoreId" TEXT,
    "source" "OrderSource" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT,
    "token" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3),
    "isClicked" BOOLEAN NOT NULL DEFAULT false,
    "attributionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignOrder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "storeOrderId" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAutomation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StoreAutomationType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "shopifyStoreId" TEXT,
    "easyOrdersStoreId" TEXT,
    "wooCommerceStoreId" TEXT,
    "templateVariables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "cartTotal" DOUBLE PRECISION,
    "cartItems" JSONB,
    "recoveryUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "shopifyStoreId" TEXT,
    "wooCommerceStoreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ar',
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadBotConfig" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'ar',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadBotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "DeveloperStatus" NOT NULL DEFAULT 'PENDING_META',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferredToUserId" TEXT,

    CONSTRAINT "developer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_projects" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transferredToUserId" TEXT,
    "transferredAt" TIMESTAMP(3),

    CONSTRAINT "developer_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_meta_connections" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "displayPhone" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_meta_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_otp_templates" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "metaTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "category" "TemplateCategory" NOT NULL DEFAULT 'AUTHENTICATION',
    "status" "DeveloperTemplateStatus" NOT NULL DEFAULT 'LOCAL_DRAFT',
    "headerType" TEXT,
    "headerText" TEXT,
    "body" TEXT NOT NULL,
    "bodyExample" TEXT,
    "footer" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_otp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_api_keys" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT,
    "status" "DeveloperApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "developer_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_logs" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OtpLogStatus" NOT NULL DEFAULT 'PENDING',
    "metaMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE INDEX "User_parentId_idx" ON "User"("parentId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_userId_key" ON "WhatsAppAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_wabaId_key" ON "WhatsAppAccount"("wabaId");

-- CreateIndex
CREATE INDEX "MessageQueue_status_scheduledAt_idx" ON "MessageQueue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MessageQueue_phoneNumberId_status_idx" ON "MessageQueue"("phoneNumberId", "status");

-- CreateIndex
CREATE INDEX "MessageQueue_campaignId_idx" ON "MessageQueue"("campaignId");

-- CreateIndex
CREATE INDEX "MessageQueue_userId_status_idx" ON "MessageQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "MessageQueue_status_nextRetryAt_idx" ON "MessageQueue"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Audience_userId_idx" ON "Audience"("userId");

-- CreateIndex
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_lastMessageAt_idx" ON "Contact"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_userId_key" ON "Contact"("phone", "userId");

-- CreateIndex
CREATE INDEX "Template_userId_idx" ON "Template"("userId");

-- CreateIndex
CREATE INDEX "Template_status_idx" ON "Template"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Template_metaId_userId_key" ON "Template"("metaId", "userId");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_scheduled_at_idx" ON "Campaign"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "Message_whatsappId_key" ON "Message"("whatsappId");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE INDEX "Message_contactId_idx" ON "Message"("contactId");

-- CreateIndex
CREATE INDEX "Message_campaignId_idx" ON "Message"("campaignId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_contactId_createdAt_idx" ON "Message"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderType_idx" ON "Message"("senderType");

-- CreateIndex
CREATE INDEX "WebhookLog_processed_idx" ON "WebhookLog"("processed");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "Testimonial_approved_idx" ON "Testimonial"("approved");

-- CreateIndex
CREATE INDEX "Testimonial_createdAt_idx" ON "Testimonial"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_userId_key" ON "ShopifyStore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_shop_key" ON "ShopifyStore"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "EasyOrdersStore_userId_key" ON "EasyOrdersStore"("userId");

-- CreateIndex
CREATE INDEX "EasyOrdersStore_userId_idx" ON "EasyOrdersStore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WooCommerceStore_userId_key" ON "WooCommerceStore"("userId");

-- CreateIndex
CREATE INDEX "WooCommerceStore_userId_idx" ON "WooCommerceStore"("userId");

-- CreateIndex
CREATE INDEX "AutomationRule_userId_isEnabled_idx" ON "AutomationRule"("userId", "isEnabled");

-- CreateIndex
CREATE INDEX "AutomationRule_triggerType_idx" ON "AutomationRule"("triggerType");

-- CreateIndex
CREATE INDEX "AutomationRule_userId_triggerType_idx" ON "AutomationRule"("userId", "triggerType");

-- CreateIndex
CREATE UNIQUE INDEX "AIAgent_userId_key" ON "AIAgent"("userId");

-- CreateIndex
CREATE INDEX "StoreOrder_userId_idx" ON "StoreOrder"("userId");

-- CreateIndex
CREATE INDEX "StoreOrder_contactId_idx" ON "StoreOrder"("contactId");

-- CreateIndex
CREATE INDEX "StoreOrder_customerPhone_userId_idx" ON "StoreOrder"("customerPhone", "userId");

-- CreateIndex
CREATE INDEX "StoreOrder_source_userId_idx" ON "StoreOrder"("source", "userId");

-- CreateIndex
CREATE INDEX "StoreOrder_orderedAt_idx" ON "StoreOrder"("orderedAt");

-- CreateIndex
CREATE INDEX "StoreOrder_wooCommerceStoreId_idx" ON "StoreOrder"("wooCommerceStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreOrder_source_externalId_userId_key" ON "StoreOrder"("source", "externalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedClick_token_key" ON "TrackedClick"("token");

-- CreateIndex
CREATE INDEX "TrackedClick_campaignId_idx" ON "TrackedClick"("campaignId");

-- CreateIndex
CREATE INDEX "TrackedClick_contactId_idx" ON "TrackedClick"("contactId");

-- CreateIndex
CREATE INDEX "TrackedClick_userId_isClicked_idx" ON "TrackedClick"("userId", "isClicked");

-- CreateIndex
CREATE INDEX "TrackedClick_attributionExpiresAt_idx" ON "TrackedClick"("attributionExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignOrder_storeOrderId_key" ON "CampaignOrder"("storeOrderId");

-- CreateIndex
CREATE INDEX "CampaignOrder_campaignId_idx" ON "CampaignOrder"("campaignId");

-- CreateIndex
CREATE INDEX "StoreAutomation_userId_idx" ON "StoreAutomation"("userId");

-- CreateIndex
CREATE INDEX "StoreAutomation_shopifyStoreId_idx" ON "StoreAutomation"("shopifyStoreId");

-- CreateIndex
CREATE INDEX "StoreAutomation_easyOrdersStoreId_idx" ON "StoreAutomation"("easyOrdersStoreId");

-- CreateIndex
CREATE INDEX "StoreAutomation_wooCommerceStoreId_idx" ON "StoreAutomation"("wooCommerceStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreAutomation_shopifyStoreId_type_key" ON "StoreAutomation"("shopifyStoreId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StoreAutomation_easyOrdersStoreId_type_key" ON "StoreAutomation"("easyOrdersStoreId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StoreAutomation_wooCommerceStoreId_type_key" ON "StoreAutomation"("wooCommerceStoreId", "type");

-- CreateIndex
CREATE INDEX "AbandonedCart_userId_idx" ON "AbandonedCart"("userId");

-- CreateIndex
CREATE INDEX "AbandonedCart_customerPhone_userId_idx" ON "AbandonedCart"("customerPhone", "userId");

-- CreateIndex
CREATE INDEX "AbandonedCart_shopifyStoreId_idx" ON "AbandonedCart"("shopifyStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_source_externalId_userId_key" ON "AbandonedCart"("source", "externalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadBotConfig_ownerId_key" ON "LeadBotConfig"("ownerId");

-- CreateIndex
CREATE INDEX "LeadBotConfig_ownerId_idx" ON "LeadBotConfig"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "developer_users_email_key" ON "developer_users"("email");

-- CreateIndex
CREATE INDEX "developer_projects_developerId_idx" ON "developer_projects"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "developer_meta_connections_developerId_key" ON "developer_meta_connections"("developerId");

-- CreateIndex
CREATE INDEX "developer_otp_templates_developerId_idx" ON "developer_otp_templates"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "developer_api_keys_keyHash_key" ON "developer_api_keys"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "otp_logs_token_key" ON "otp_logs"("token");

-- CreateIndex
CREATE INDEX "otp_logs_developerId_createdAt_idx" ON "otp_logs"("developerId", "createdAt");

-- CreateIndex
CREATE INDEX "otp_logs_token_idx" ON "otp_logs"("token");

-- CreateIndex
CREATE INDEX "otp_logs_phone_developerId_idx" ON "otp_logs"("phone", "developerId");

-- CreateIndex
CREATE INDEX "otp_logs_status_idx" ON "otp_logs"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_whatsappAccountId_fkey" FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyStore" ADD CONSTRAINT "ShopifyStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EasyOrdersStore" ADD CONSTRAINT "EasyOrdersStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WooCommerceStore" ADD CONSTRAINT "WooCommerceStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAgent" ADD CONSTRAINT "AIAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_easyOrdersStoreId_fkey" FOREIGN KEY ("easyOrdersStoreId") REFERENCES "EasyOrdersStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_wooCommerceStoreId_fkey" FOREIGN KEY ("wooCommerceStoreId") REFERENCES "WooCommerceStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "ShopifyStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedClick" ADD CONSTRAINT "TrackedClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignOrder" ADD CONSTRAINT "CampaignOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignOrder" ADD CONSTRAINT "CampaignOrder_storeOrderId_fkey" FOREIGN KEY ("storeOrderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_easyOrdersStoreId_fkey" FOREIGN KEY ("easyOrdersStoreId") REFERENCES "EasyOrdersStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_shopifyStoreId_fkey" FOREIGN KEY ("shopifyStoreId") REFERENCES "ShopifyStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_wooCommerceStoreId_fkey" FOREIGN KEY ("wooCommerceStoreId") REFERENCES "WooCommerceStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAutomation" ADD CONSTRAINT "StoreAutomation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_projects" ADD CONSTRAINT "developer_projects_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_meta_connections" ADD CONSTRAINT "developer_meta_connections_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_otp_templates" ADD CONSTRAINT "developer_otp_templates_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_logs" ADD CONSTRAINT "otp_logs_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
