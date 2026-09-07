-- Shopify GDPR admin notification type (rare compliance events).

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHOPIFY_GDPR';
