CREATE TABLE "WebsitePage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "contentHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCrawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsitePage_userId_url_key" ON "WebsitePage"("userId", "url");
CREATE INDEX "WebsitePage_userId_idx" ON "WebsitePage"("userId");
CREATE TABLE "WebsiteKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteKnowledgeChunk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebsiteKnowledgeChunk_userId_idx" ON "WebsiteKnowledgeChunk"("userId");
CREATE TABLE "WebsiteCrawlSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rootUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteCrawlSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsiteCrawlSettings_userId_key" ON "WebsiteCrawlSettings"("userId");
ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteKnowledgeChunk" ADD CONSTRAINT "WebsiteKnowledgeChunk_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteCrawlSettings" ADD CONSTRAINT "WebsiteCrawlSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
