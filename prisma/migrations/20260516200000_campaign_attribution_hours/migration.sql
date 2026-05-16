-- إضافة attributionHours لجدول Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "attributionHours" INTEGER NOT NULL DEFAULT 48;