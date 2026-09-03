-- EasyOrders generates a DIFFERENT secret for every webhook created, even when
-- multiple webhooks point at the same URL. Since WANI needs two webhooks
-- (type "Orders" and type "Order Status Update") to receive both order
-- creation and status-change events, a single webhookSecret column cannot
-- validate both. This migration splits it into two nullable columns.
--
-- Data-safe: the existing "webhookSecret" column is renamed (not dropped),
-- so any value already stored is preserved under the new "orders" column.
-- No rows are deleted.

ALTER TABLE "EasyOrdersStore" RENAME COLUMN "webhookSecret" TO "webhookSecretOrders";
ALTER TABLE "EasyOrdersStore" ADD COLUMN "webhookSecretStatusUpdate" TEXT;
