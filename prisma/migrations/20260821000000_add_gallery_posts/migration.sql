-- CreateEnum
CREATE TYPE "GalleryCategory" AS ENUM ('EXPLORE', 'CONFESSIONS', 'PEOPLE', 'START_HERE', 'TWENTIES');

-- CreateEnum
CREATE TYPE "GalleryMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "GalleryPost" (
    "id" TEXT NOT NULL,
    "mediaType" "GalleryMediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "altText" TEXT,
    "category" "GalleryCategory" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryPost_category_status_idx" ON "GalleryPost"("category", "status");

-- CreateIndex
CREATE INDEX "GalleryPost_status_publishedAt_idx" ON "GalleryPost"("status", "publishedAt");
