-- AddNotificationTypes: إضافة أنواع إشعارات المتجر
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORE_AUTO_SENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORE_AUTO_FAILED';