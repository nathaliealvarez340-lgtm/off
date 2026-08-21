-- CreateEnum
CREATE TYPE "GalleryShareType" AS ENUM ('INTERNAL', 'EXTERNAL', 'COPY_LINK');

-- AlterTable
ALTER TABLE "GalleryPost"
ADD COLUMN "mediaTransform" JSONB,
ADD COLUMN "audioUrl" TEXT,
ADD COLUMN "audioTitle" TEXT,
ADD COLUMN "audioArtist" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "href" TEXT;

-- CreateTable
CREATE TABLE "GalleryPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GalleryPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GalleryPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "type" "GalleryShareType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GalleryPostShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GalleryPostLike_postId_userId_key" ON "GalleryPostLike"("postId", "userId");
CREATE INDEX "GalleryPostLike_postId_idx" ON "GalleryPostLike"("postId");
CREATE INDEX "GalleryPostLike_userId_idx" ON "GalleryPostLike"("userId");
CREATE INDEX "GalleryPostComment_postId_createdAt_idx" ON "GalleryPostComment"("postId", "createdAt");
CREATE INDEX "GalleryPostComment_userId_idx" ON "GalleryPostComment"("userId");
CREATE INDEX "GalleryPostShare_postId_createdAt_idx" ON "GalleryPostShare"("postId", "createdAt");
CREATE INDEX "GalleryPostShare_senderId_idx" ON "GalleryPostShare"("senderId");
CREATE INDEX "GalleryPostShare_recipientId_idx" ON "GalleryPostShare"("recipientId");

-- AddForeignKey
ALTER TABLE "GalleryPostLike" ADD CONSTRAINT "GalleryPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GalleryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostLike" ADD CONSTRAINT "GalleryPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostComment" ADD CONSTRAINT "GalleryPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GalleryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostComment" ADD CONSTRAINT "GalleryPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostShare" ADD CONSTRAINT "GalleryPostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GalleryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostShare" ADD CONSTRAINT "GalleryPostShare_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPostShare" ADD CONSTRAINT "GalleryPostShare_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
