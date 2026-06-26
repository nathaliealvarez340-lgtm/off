-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "TopicSuggestion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicSuggestion_articleId_idx" ON "TopicSuggestion"("articleId");

-- CreateIndex
CREATE INDEX "TopicSuggestion_userId_idx" ON "TopicSuggestion"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicSuggestion" ADD CONSTRAINT "TopicSuggestion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicSuggestion" ADD CONSTRAINT "TopicSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
