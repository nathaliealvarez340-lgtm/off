CREATE TABLE "MemberActivity" (
  "userId" TEXT NOT NULL,
  "totalSeconds" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberActivity_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "ArticleCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ArticleCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleCompletion_userId_articleId_key" ON "ArticleCompletion"("userId", "articleId");
CREATE INDEX "ArticleCompletion_userId_idx" ON "ArticleCompletion"("userId");
CREATE INDEX "ArticleCompletion_articleId_idx" ON "ArticleCompletion"("articleId");

ALTER TABLE "MemberActivity" ADD CONSTRAINT "MemberActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleCompletion" ADD CONSTRAINT "ArticleCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleCompletion" ADD CONSTRAINT "ArticleCompletion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
