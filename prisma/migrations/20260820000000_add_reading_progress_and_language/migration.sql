ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'es';

CREATE TABLE "ArticleReadingProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastPosition" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ArticleReadingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleReadingProgress_userId_articleId_key" ON "ArticleReadingProgress"("userId", "articleId");
CREATE INDEX "ArticleReadingProgress_userId_updatedAt_idx" ON "ArticleReadingProgress"("userId", "updatedAt");
CREATE INDEX "ArticleReadingProgress_articleId_idx" ON "ArticleReadingProgress"("articleId");

ALTER TABLE "ArticleReadingProgress" ADD CONSTRAINT "ArticleReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleReadingProgress" ADD CONSTRAINT "ArticleReadingProgress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
