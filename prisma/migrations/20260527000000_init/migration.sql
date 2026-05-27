CREATE TABLE "Article" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coverImage" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "author" TEXT NOT NULL DEFAULT 'Nathalie Garcia',
  "readTime" TEXT NOT NULL,
  "publishedAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

CREATE TABLE "Subscriber" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "interest" TEXT NOT NULL,
  "consent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");
