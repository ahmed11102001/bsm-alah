-- CreateTable
CREATE TABLE "GoogleSheetsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audienceId" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "spreadsheetId" TEXT,
    "spreadsheetName" TEXT,
    "sheetId" TEXT,
    "sheetName" TEXT,
    "nameColumn" TEXT,
    "phoneColumn" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncInterval" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSheetsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSheetsConnection_audienceId_key" ON "GoogleSheetsConnection"("audienceId");
CREATE INDEX "GoogleSheetsConnection_userId_idx" ON "GoogleSheetsConnection"("userId");
CREATE INDEX "GoogleSheetsConnection_userId_syncInterval_lastSyncAt_idx" ON "GoogleSheetsConnection"("userId", "syncInterval", "lastSyncAt");

-- AddForeignKey
ALTER TABLE "GoogleSheetsConnection" ADD CONSTRAINT "GoogleSheetsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleSheetsConnection" ADD CONSTRAINT "GoogleSheetsConnection_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
