-- AlterTable
ALTER TABLE "developer_cli_authorizations" ADD COLUMN "browserTicketHash" TEXT,
ADD COLUMN "browserTicketExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "developer_cli_authorizations_browserTicketHash_key" ON "developer_cli_authorizations"("browserTicketHash");
