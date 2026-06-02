import type { Article } from "@prisma/client";
import { getDb } from "./db";
export { slugify } from "./slug";

export type EditorialBlock =
  | { type: "paragraph" | "h1" | "h2" | "h3" | "highlight" | "code"; text: string; align?: "left" | "center" | "right"; color?: string; highlightColor?: string }
  | { type: "list" | "numbered" | "checklist"; items: string[] }
  | { type: "quote" | "pullquote"; text: string }
  | { type: "divider" }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      align?: "full" | "center" | "left" | "right" | "image-left" | "image-right";
      width?: string;
      wrapMode?: string;
      objectFit?: string;
      objectPosition?: string;
      aspectRatio?: string;
    }
  | { type: "gallery" | "collage"; images: Array<{ src: string; alt?: string; caption?: string }> }
  | {
      type: "embed" | "video";
      url: string;
      caption?: string;
      label?: string;
      align?: "full" | "center" | "left" | "right";
      width?: string;
      wrapMode?: string;
      objectFit?: string;
      objectPosition?: string;
      aspectRatio?: string;
    }
  | { type: "cta"; text: string; url: string; label: string }
  | { type: "subscribe" | "share"; text: string }
  | { type: "stat"; value: string; label: string }
  | { type: "columns"; left: string; right: string }
  | { type: "special"; label: "Reality Check" | "Reflexion" | "Estrategia" | "Accion"; text: string };

export function parseArticleContent(content: string): EditorialBlock[] {
  try {
    const parsed = JSON.parse(content) as EditorialBlock[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return content
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((text) => ({ type: "paragraph", text }));
  }

  return [{ type: "paragraph", text: content }];
}

export function formatDate(date: Date | null) {
  if (!date) return "Borrador";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function getPublishedArticles() {
  return getDb().article.findMany({
    where: { status: "published" },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getFirstPublishedArticle() {
  return getDb().article.findFirst({
    where: { status: "published" },
    orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }],
  });
}

export async function getAllArticles() {
  return getDb().article.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getArticleBySlug(slug: string) {
  return getDb().article.findUnique({ where: { slug } });
}

export async function getArticleById(id: string) {
  return getDb().article.findUnique({ where: { id } });
}

export function getFeaturedArticle(articles: Article[]) {
  return articles.find((article) => article.featured) ?? articles[0];
}

export async function getPublishedComments(articleId: string) {
  return getDb().comment.findMany({
    where: { articleId, status: "PUBLISHED", parentId: null },
    include: {
      user: { select: { name: true } },
      replies: {
        where: { status: "PUBLISHED" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
