import "server-only";

import type { GalleryCategory } from "@prisma/client";
import { getPlainTextPreview, INTERNAL_CONTENT_CATEGORIES, parseArticleContent, stripHtml } from "@/lib/articles";
import { getDb } from "@/lib/db";
import { GALLERY_CATEGORY_LABELS } from "@/lib/gallery";

export type OffSearchResult = {
  id: string;
  type: "article" | "gallery" | "library" | "signal" | "resource" | "note";
  title: string;
  excerpt?: string;
  thumbnail?: string;
  category?: string;
  href?: string;
  galleryId?: string;
};

const LOUNGE_RESULT_TYPES = {
  LIBRARY: "library",
  SIGNAL: "signal",
  RESOURCE: "resource",
  NATHALIE_NOTE: "note",
} as const;

function relevance(query: string, title: string, excerpt = "", category = "", body = "") {
  const q = query.toLocaleLowerCase();
  const normalizedTitle = stripHtml(title).toLocaleLowerCase();
  if (normalizedTitle === q) return 500;
  if (normalizedTitle.startsWith(q)) return 420;
  if (normalizedTitle.includes(q)) return 360;
  if (stripHtml(excerpt).toLocaleLowerCase().includes(q)) return 260;
  if (category.toLocaleLowerCase().includes(q)) return 180;
  if (stripHtml(body).toLocaleLowerCase().includes(q)) return 100;
  return 0;
}

function articleBodyText(content: string) {
  return parseArticleContent(content).map((block) => {
    if ("text" in block) return stripHtml(block.text);
    if ("items" in block) return block.items.map(stripHtml).join(" ");
    if (block.type === "image" || block.type === "video") return block.caption ?? "";
    if (block.type === "gallery" || block.type === "collage") return block.caption ?? "";
    return "";
  }).filter(Boolean).join(" ");
}

function matchingSnippet(query: string, preferred: string, body: string) {
  const cleanPreferred = stripHtml(preferred);
  if (cleanPreferred.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return getPlainTextPreview(cleanPreferred, 180);
  const cleanBody = stripHtml(body);
  const index = cleanBody.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return getPlainTextPreview(cleanPreferred || cleanBody, 180);
  const start = Math.max(0, index - 70);
  const end = Math.min(cleanBody.length, index + query.length + 90);
  return `${start > 0 ? "…" : ""}${cleanBody.slice(start, end).trim()}${end < cleanBody.length ? "…" : ""}`;
}

export async function searchOffContent(rawQuery: string): Promise<OffSearchResult[]> {
  const query = rawQuery.trim().slice(0, 120);
  if (query.length < 2) return [];

  const db = getDb();
  const contains = { contains: query, mode: "insensitive" as const };
  const matchingGalleryCategories = (Object.entries(GALLERY_CATEGORY_LABELS) as Array<[GalleryCategory, string]>)
    .filter(([category, label]) => category.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .map(([category]) => category);
  const [articles, galleryPosts, loungeItems] = await Promise.all([
    db.article.findMany({
      where: {
        status: "published",
        category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] },
        OR: [{ title: contains }, { excerpt: contains }, { category: contains }, { content: contains }],
      },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: 24,
    }),
    db.galleryPost.findMany({
      where: {
        status: "published",
        OR: [{ title: contains }, { caption: contains }, { altText: contains }, ...(matchingGalleryCategories.length ? [{ category: { in: matchingGalleryCategories } }] : [])],
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 24,
    }),
    db.loungeContent.findMany({
      where: {
        status: "published",
        type: { in: ["LIBRARY", "SIGNAL", "RESOURCE", "NATHALIE_NOTE"] },
        OR: [{ title: contains }, { description: contains }, { content: contains }],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 24,
    }),
  ]);

  return [
    ...articles.map((article) => {
      const body = articleBodyText(article.content);
      return {
        score: relevance(query, article.title, article.excerpt, article.category, body),
        result: {
        id: article.id,
        type: "article" as const,
        title: getPlainTextPreview(article.title, 120),
        excerpt: matchingSnippet(query, article.excerpt, body),
        thumbnail: article.coverImage || undefined,
        category: article.category,
        href: `/off/${article.slug}`,
        },
      };
    }),
    ...galleryPosts.map((post) => ({
      score: relevance(query, post.title ?? "", post.caption ?? "", GALLERY_CATEGORY_LABELS[post.category], post.altText ?? ""),
      result: {
        id: post.id,
        type: "gallery" as const,
        title: getPlainTextPreview(post.title || post.caption || GALLERY_CATEGORY_LABELS[post.category], 120),
        excerpt: post.caption ? getPlainTextPreview(post.caption, 180) : undefined,
        thumbnail: post.thumbnailUrl ?? (post.mediaType === "IMAGE" ? post.mediaUrl : undefined),
        category: GALLERY_CATEGORY_LABELS[post.category],
        galleryId: post.id,
      },
    })),
    ...loungeItems.map((item) => ({
      score: relevance(query, item.title, item.description ?? "", item.type, item.content ?? ""),
      result: {
        id: item.id,
        type: LOUNGE_RESULT_TYPES[item.type as keyof typeof LOUNGE_RESULT_TYPES],
        title: getPlainTextPreview(item.title, 120),
        excerpt: getPlainTextPreview(item.description ?? item.content ?? "", 180) || undefined,
        category: item.type,
        href: item.type === "LIBRARY" ? "/lounge#biblioteca" : "/lounge",
      },
    })),
  ]
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((entry) => entry.result);
}

export async function galleryCategoryResults(category: GalleryCategory): Promise<OffSearchResult[]> {
  const posts = await getDb().galleryPost.findMany({
    where: { category, status: "published" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 24,
  });
  return posts.map((post) => ({
    id: post.id,
    type: "gallery",
    title: getPlainTextPreview(post.title || post.caption || GALLERY_CATEGORY_LABELS[post.category], 120),
    excerpt: post.caption ? getPlainTextPreview(post.caption, 180) : undefined,
    thumbnail: post.thumbnailUrl ?? (post.mediaType === "IMAGE" ? post.mediaUrl : undefined),
    category: GALLERY_CATEGORY_LABELS[post.category],
    galleryId: post.id,
  }));
}
