-- Add isSuper field to User model
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuper" BOOLEAN NOT NULL DEFAULT false;