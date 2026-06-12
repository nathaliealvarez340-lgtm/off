-- CreateEnum
CREATE TYPE "LoungeContentType" AS ENUM ('LIBRARY', 'SIGNAL', 'RESOURCE', 'NATHALIE_NOTE', 'EARLY_ACCESS');

-- CreateTable
CREATE TABLE "LoungeContent" (
    "id" TEXT NOT NULL,
    "type" "LoungeContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "description" TEXT,
    "content" TEXT,
    "links" JSONB,
    "relatedArticle" TEXT,
    "releaseDate" TIMESTAMP(3),
    "statusLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoungeContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoungeContent_type_status_idx" ON "LoungeContent"("type", "status");

-- CreateIndex
CREATE INDEX "LoungeContent_publishedAt_idx" ON "LoungeContent"("publishedAt");

-- Preserve private editorial pieces that were previously stored as articles.
INSERT INTO "LoungeContent" (
    "id",
    "type",
    "title",
    "description",
    "content",
    "status",
    "publishedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || "id",
    CASE
        WHEN "category" = 'Biblioteca curada' THEN 'LIBRARY'::"LoungeContentType"
        WHEN "category" = 'Nota privada' THEN 'SIGNAL'::"LoungeContentType"
        WHEN "category" = 'Archivo desbloqueado' THEN 'RESOURCE'::"LoungeContentType"
        ELSE 'EARLY_ACCESS'::"LoungeContentType"
    END,
    "title",
    "excerpt",
    CASE WHEN "category" = 'Nota privada' THEN "excerpt" ELSE NULL END,
    "status",
    "publishedAt",
    "createdAt",
    "updatedAt"
FROM "Article"
WHERE "category" IN ('Biblioteca curada', 'Nota privada', 'Archivo desbloqueado', 'Early Access');
