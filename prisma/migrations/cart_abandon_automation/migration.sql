-- Migration: cart_abandon_automation
-- إضافة cart_abandon للأتمتة + AbandonedCart model + failedCount/lastSentAt

-- 1. إضافة cart_abandon لـ enum
ALTER TYPE "StoreAutomationType" ADD VALUE IF NOT EXISTS 'cart_abandon';

-- 2. إضافة failedCount و lastSentAt لـ StoreAutomation
ALTER TABLE "StoreAutomation"
  ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastSentAt"  TIMESTAMP(3);

-- 3. إنشاء جدول AbandonedCart
CREATE TABLE IF NOT EXISTS "AbandonedCart" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "source"            TEXT NOT NULL,
  "externalId"        TEXT NOT NULL,
  "customerPhone"     TEXT NOT NULL,
  "customerName"      TEXT,
  "cartTotal"         DOUBLE PRECISION,
  "cartItems"         JSONB,
  "recoveryUrl"       TEXT,
  "sentAt"            TIMESTAMP(3),
  "recoveredAt"       TIMESTAMP(3),
  "shopifyStoreId"    TEXT,
  "wooCommerceStoreId" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "AbandonedCart_source_externalId_userId_key"
  ON "AbandonedCart"("source", "externalId", "userId");

-- Indexes
CREATE INDEX IF NOT EXISTS "AbandonedCart_userId_idx"           ON "AbandonedCart"("userId");
CREATE INDEX IF NOT EXISTS "AbandonedCart_customerPhone_userId_idx" ON "AbandonedCart"("customerPhone", "userId");
CREATE INDEX IF NOT EXISTS "AbandonedCart_shopifyStoreId_idx"   ON "AbandonedCart"("shopifyStoreId");