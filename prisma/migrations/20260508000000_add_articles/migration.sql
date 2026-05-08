-- CreateTable: Article
CREATE TABLE "Article" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "excerpt"     TEXT,
    "content"     TEXT NOT NULL DEFAULT '',
    "coverImage"  TEXT,
    "published"   BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
