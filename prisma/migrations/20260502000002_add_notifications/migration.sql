-- Create NotificationType enum
CREATE TYPE "NotificationType" AS ENUM (
  'CAMPAIGN_SUCCESS',
  'CAMPAIGN_FAILED',
  'CAMPAIGN_PARTIAL',
  'PLAN_LIMIT_REACHED',
  'NEW_MESSAGE'
);

-- Create Notification table
CREATE TABLE "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "NotificationType" NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "link"      TEXT,
  "meta"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Foreign key
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx"        ON "Notification"("userId", "createdAt");
