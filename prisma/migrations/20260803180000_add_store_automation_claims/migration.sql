ALTER TABLE "StoreOrder" ADD COLUMN "confirmationClaimedAt" TIMESTAMP(3);
ALTER TABLE "AbandonedCart" ADD COLUMN "sendClaimedAt" TIMESTAMP(3);

CREATE INDEX "StoreOrder_confirmationClaimedAt_idx" ON "StoreOrder"("confirmationClaimedAt");
CREATE INDEX "StoreOrder_shippedAt_shippedMessageId_idx" ON "StoreOrder"("shippedAt", "shippedMessageId");
CREATE INDEX "AbandonedCart_sendClaimedAt_sentAt_idx" ON "AbandonedCart"("sendClaimedAt", "sentAt");
