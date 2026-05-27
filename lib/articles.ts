import type { Article } from "@prisma/client";
import { getDb } from "./db";
export { slugify } from "./slug";

export type EditorialBlock =
  | { type: "paragraph"; text: string }
  | { type: "h2" | "h3"; text: string }
  | { type: "quote"; text: string }
  | { type: "divider" }
  | { type: "image"; src: string; alt: string }
  | {
      type: "special";
      label: "Reality Check" | "Reflexión" | "Estrategia" | "Acción";
      text: string;
    };

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
