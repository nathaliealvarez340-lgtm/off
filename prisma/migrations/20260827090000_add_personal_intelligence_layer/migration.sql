CREATE TYPE "OffIrlEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "OffIrlRsvpStatus" AS ENUM ('GOING', 'WAITLIST', 'CANCELLED');
ALTER TABLE "Article" ADD COLUMN "themes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "askOffPersonalContext" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ArticleHighlight" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "articleId" TEXT NOT NULL,
  "selectedText" TEXT NOT NULL, "blockId" TEXT, "startOffset" INTEGER, "endOffset" INTEGER,
  "prefix" TEXT, "suffix" TEXT, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ArticleHighlight_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EditorialConversation" (
  "id" TEXT NOT NULL, "internalTitle" TEXT NOT NULL, "question" TEXT NOT NULL, "introduction" TEXT,
  "themes" TEXT[] DEFAULT ARRAY[]::TEXT[], "status" TEXT NOT NULL DEFAULT 'draft', "publishedAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3), "featured" BOOLEAN NOT NULL DEFAULT false, "articleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EditorialConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EditorialConversationReply" (
  "id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "parentId" TEXT,
  "content" TEXT NOT NULL, "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED', "featured" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "EditorialConversationReply_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EditorialConversationReplyLike" (
  "id" TEXT NOT NULL, "replyId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EditorialConversationReplyLike_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Ritual" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "prompt" TEXT NOT NULL, "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "activeFrom" TIMESTAMP(3) NOT NULL, "activeUntil" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ritual_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RitualResponse" (
  "id" TEXT NOT NULL, "ritualId" TEXT NOT NULL, "userId" TEXT NOT NULL, "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RitualResponse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AskOffConversation" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "usePersonalContext" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AskOffConversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AskOffMessage" (
  "id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "role" TEXT NOT NULL, "content" TEXT NOT NULL,
  "sources" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AskOffMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OffIrlEvent" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "locationName" TEXT, "city" TEXT,
  "country" TEXT, "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "capacity" INTEGER,
  "image" TEXT, "status" "OffIrlEventStatus" NOT NULL DEFAULT 'DRAFT', "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3), "externalMapUrl" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OffIrlEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OffIrlRsvp" (
  "id" TEXT NOT NULL, "eventId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "status" "OffIrlRsvpStatus" NOT NULL DEFAULT 'GOING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OffIrlRsvp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArticleHighlight_userId_articleId_idx" ON "ArticleHighlight"("userId", "articleId");
CREATE INDEX "ArticleHighlight_userId_updatedAt_idx" ON "ArticleHighlight"("userId", "updatedAt");
CREATE INDEX "EditorialConversation_status_publishedAt_idx" ON "EditorialConversation"("status", "publishedAt");
CREATE INDEX "EditorialConversation_featured_publishedAt_idx" ON "EditorialConversation"("featured", "publishedAt");
CREATE INDEX "EditorialConversationReply_conversationId_createdAt_idx" ON "EditorialConversationReply"("conversationId", "createdAt");
CREATE INDEX "EditorialConversationReply_userId_idx" ON "EditorialConversationReply"("userId");
CREATE INDEX "EditorialConversationReply_parentId_idx" ON "EditorialConversationReply"("parentId");
CREATE INDEX "EditorialConversationReplyLike_replyId_idx" ON "EditorialConversationReplyLike"("replyId");
CREATE INDEX "EditorialConversationReplyLike_userId_idx" ON "EditorialConversationReplyLike"("userId");
CREATE UNIQUE INDEX "EditorialConversationReplyLike_replyId_userId_key" ON "EditorialConversationReplyLike"("replyId", "userId");
CREATE INDEX "Ritual_status_activeFrom_activeUntil_idx" ON "Ritual"("status", "activeFrom", "activeUntil");
CREATE INDEX "RitualResponse_userId_updatedAt_idx" ON "RitualResponse"("userId", "updatedAt");
CREATE UNIQUE INDEX "RitualResponse_ritualId_userId_key" ON "RitualResponse"("ritualId", "userId");
CREATE INDEX "AskOffConversation_userId_updatedAt_idx" ON "AskOffConversation"("userId", "updatedAt");
CREATE INDEX "AskOffMessage_conversationId_createdAt_idx" ON "AskOffMessage"("conversationId", "createdAt");
CREATE INDEX "OffIrlEvent_status_startAt_idx" ON "OffIrlEvent"("status", "startAt");
CREATE INDEX "OffIrlRsvp_eventId_status_idx" ON "OffIrlRsvp"("eventId", "status");
CREATE INDEX "OffIrlRsvp_userId_idx" ON "OffIrlRsvp"("userId");
CREATE UNIQUE INDEX "OffIrlRsvp_eventId_userId_key" ON "OffIrlRsvp"("eventId", "userId");

ALTER TABLE "ArticleHighlight" ADD CONSTRAINT "ArticleHighlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleHighlight" ADD CONSTRAINT "ArticleHighlight_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialConversation" ADD CONSTRAINT "EditorialConversation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EditorialConversationReply" ADD CONSTRAINT "EditorialConversationReply_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "EditorialConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialConversationReply" ADD CONSTRAINT "EditorialConversationReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialConversationReply" ADD CONSTRAINT "EditorialConversationReply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EditorialConversationReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialConversationReplyLike" ADD CONSTRAINT "EditorialConversationReplyLike_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "EditorialConversationReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialConversationReplyLike" ADD CONSTRAINT "EditorialConversationReplyLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RitualResponse" ADD CONSTRAINT "RitualResponse_ritualId_fkey" FOREIGN KEY ("ritualId") REFERENCES "Ritual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RitualResponse" ADD CONSTRAINT "RitualResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AskOffConversation" ADD CONSTRAINT "AskOffConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AskOffMessage" ADD CONSTRAINT "AskOffMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AskOffConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OffIrlRsvp" ADD CONSTRAINT "OffIrlRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OffIrlEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OffIrlRsvp" ADD CONSTRAINT "OffIrlRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
