-- CreateTable
CREATE TABLE "developer_cli_authorizations" (
    "id" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "userCodeHash" TEXT NOT NULL,
    "developerId" TEXT,
    "deviceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_cli_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_cli_sessions" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "developer_cli_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developer_cli_authorizations_deviceCodeHash_key" ON "developer_cli_authorizations"("deviceCodeHash");
CREATE UNIQUE INDEX "developer_cli_authorizations_userCodeHash_key" ON "developer_cli_authorizations"("userCodeHash");
CREATE INDEX "developer_cli_authorizations_developerId_idx" ON "developer_cli_authorizations"("developerId");
CREATE INDEX "developer_cli_authorizations_expiresAt_idx" ON "developer_cli_authorizations"("expiresAt");
CREATE UNIQUE INDEX "developer_cli_sessions_tokenHash_key" ON "developer_cli_sessions"("tokenHash");
CREATE INDEX "developer_cli_sessions_developerId_idx" ON "developer_cli_sessions"("developerId");

-- AddForeignKey
ALTER TABLE "developer_cli_authorizations" ADD CONSTRAINT "developer_cli_authorizations_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "developer_cli_sessions" ADD CONSTRAINT "developer_cli_sessions_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
