-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'WHATSAPP_TOKEN_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'AI_TOKENS_LOW';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';

-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "confirmationMessageId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "expiryWarningSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "developer_projects" ADD COLUMN     "developerRemovedAt" TIMESTAMP(3),
ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_project_invites" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "developer_project_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "developer_project_invites_projectId_status_idx" ON "developer_project_invites"("projectId", "status");

-- CreateIndex
CREATE INDEX "developer_project_invites_email_status_idx" ON "developer_project_invites"("email", "status");

-- CreateIndex
CREATE INDEX "StoreOrder_userId_confirmationMessageId_idx" ON "StoreOrder"("userId", "confirmationMessageId");

-- CreateIndex
CREATE INDEX "developer_projects_ownerId_idx" ON "developer_projects"("ownerId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_projects" ADD CONSTRAINT "developer_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "developer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_project_invites" ADD CONSTRAINT "developer_project_invites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "developer_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
