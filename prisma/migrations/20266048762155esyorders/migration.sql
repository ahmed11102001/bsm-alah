-- CreateTable: EasyOrdersStore
CREATE TABLE "EasyOrdersStore" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "storeName"     TEXT NOT NULL,
    "apiKey"        TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EasyOrdersStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EasyOrdersStore_userId_key" ON "EasyOrdersStore"("userId");

-- CreateIndex
CREATE INDEX "EasyOrdersStore_userId_idx" ON "EasyOrdersStore"("userId");

-- AddForeignKey
ALTER TABLE "EasyOrdersStore"
    ADD CONSTRAINT "EasyOrdersStore_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;