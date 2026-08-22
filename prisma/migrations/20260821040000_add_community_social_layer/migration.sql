-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DECLINED');

-- AlterTable
ALTER TABLE "GalleryPostComment" ADD COLUMN "parentId" TEXT;

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityCommentLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberConnection" (
    "id" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemberConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberAchievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" JSONB,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AchievementReaction" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AchievementReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryPostComment_parentId_idx" ON "GalleryPostComment"("parentId");
CREATE INDEX "CommunityPost_status_createdAt_idx" ON "CommunityPost"("status", "createdAt");
CREATE INDEX "CommunityPost_userId_createdAt_idx" ON "CommunityPost"("userId", "createdAt");
CREATE UNIQUE INDEX "CommunityPostLike_postId_userId_key" ON "CommunityPostLike"("postId", "userId");
CREATE INDEX "CommunityPostLike_postId_idx" ON "CommunityPostLike"("postId");
CREATE INDEX "CommunityPostLike_userId_idx" ON "CommunityPostLike"("userId");
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");
CREATE INDEX "CommunityComment_userId_idx" ON "CommunityComment"("userId");
CREATE INDEX "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");
CREATE UNIQUE INDEX "CommunityCommentLike_commentId_userId_key" ON "CommunityCommentLike"("commentId", "userId");
CREATE INDEX "CommunityCommentLike_commentId_idx" ON "CommunityCommentLike"("commentId");
CREATE INDEX "CommunityCommentLike_userId_idx" ON "CommunityCommentLike"("userId");
CREATE UNIQUE INDEX "MemberConnection_pairKey_key" ON "MemberConnection"("pairKey");
CREATE INDEX "MemberConnection_requesterId_status_idx" ON "MemberConnection"("requesterId", "status");
CREATE INDEX "MemberConnection_receiverId_status_idx" ON "MemberConnection"("receiverId", "status");
CREATE UNIQUE INDEX "MemberAchievement_key_key" ON "MemberAchievement"("key");
CREATE INDEX "MemberAchievement_userId_achievedAt_idx" ON "MemberAchievement"("userId", "achievedAt");
CREATE INDEX "MemberAchievement_achievedAt_idx" ON "MemberAchievement"("achievedAt");
CREATE UNIQUE INDEX "AchievementReaction_achievementId_userId_key" ON "AchievementReaction"("achievementId", "userId");
CREATE INDEX "AchievementReaction_achievementId_idx" ON "AchievementReaction"("achievementId");
CREATE INDEX "AchievementReaction_userId_idx" ON "AchievementReaction"("userId");
CREATE UNIQUE INDEX "MemberBlock_blockerId_blockedId_key" ON "MemberBlock"("blockerId", "blockedId");
CREATE INDEX "MemberBlock_blockedId_idx" ON "MemberBlock"("blockedId");
CREATE INDEX "SocialReport_status_createdAt_idx" ON "SocialReport"("status", "createdAt");
CREATE INDEX "SocialReport_targetType_targetId_idx" ON "SocialReport"("targetType", "targetId");
CREATE INDEX "SocialReport_reporterId_idx" ON "SocialReport"("reporterId");

-- AddForeignKey
ALTER TABLE "GalleryPostComment" ADD CONSTRAINT "GalleryPostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GalleryPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityCommentLike" ADD CONSTRAINT "CommunityCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityCommentLike" ADD CONSTRAINT "CommunityCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberConnection" ADD CONSTRAINT "MemberConnection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberConnection" ADD CONSTRAINT "MemberConnection_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberAchievement" ADD CONSTRAINT "MemberAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementReaction" ADD CONSTRAINT "AchievementReaction_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "MemberAchievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementReaction" ADD CONSTRAINT "AchievementReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
