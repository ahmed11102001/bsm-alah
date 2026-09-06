-- Admin review notifications: new NotificationType values.
-- Rows are only ever created for super-admin users (see notifySuperAdmins
-- in src/lib/notifications.ts) — regular users never receive these types.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_PAYMENT_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_PARTNER_CARD';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_TESTIMONIAL';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_LEAD';
