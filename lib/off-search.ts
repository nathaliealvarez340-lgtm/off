import "server-only";

import type { GalleryCategory } from "@prisma/client";
import { extractArticleTranslations } from "@/lib/article-localization";
import { getPlainTextPreview, INTERNAL_CONTENT_CATEGORIES, parseArticleContent, stripHtml } from "@/lib/articles";
import { getDb } from "@/lib/db";
import { GALLERY_CATEGORY_LABELS } from "@/lib/gallery";
import { normalizeSearchText, scoreSearchDocument, type SearchLanguage } from "@/lib/search-engine";

export type OffSearchResult = {
  id: string;
  type: "article" | "gallery" | "library" | "signal" | "resource" | "note" | "conversation";
  title: string;
  excerpt?: string;
  thumbnail?: string;
  category?: string;
  href?: string;
  galleryId?: string;
};

const LOUNGE_RESULT_TYPES = { LIBRARY: "library", SIGNAL: "signal", RESOURCE: "resource", NATHALIE_NOTE: "note" } as const;

function articleBodyText(content: string) {
  return parseArticleContent(content).map((block) => {
    if ("text" in block) return stripHtml(block.text);
    if ("items" in block) return block.items.map(stripHtml).join(" ");
    if (block.type === "image" || block.type === "video") return block.caption ?? "";
    if (block.type === "gallery" || block.type === "collage") return [block.caption, ...block.images.map((image) => `${image.alt ?? ""} ${image.caption ?? ""}`)].filter(Boolean).join(" ");
    if (block.type === "embed") return `${block.label ?? ""} ${block.caption ?? ""}`;
    return "";
  }).filter(Boolean).join(" ");
}

function foldForIndex(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function matchingSnippet(terms: string[], preferred: string, body: string) {
  const cleanPreferred = stripHtml(preferred);
  const cleanBody = stripHtml(body);
  for (const source of [cleanPreferred, cleanBody]) {
    const folded = foldForIndex(source);
    for (const term of terms) {
      const index = folded.indexOf(foldForIndex(term));
      if (index < 0) continue;
      const start = Math.max(0, index - 70);
      const end = Math.min(source.length, index + term.length + 100);
      return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
    }
  }
  return getPlainTextPreview(cleanPreferred || cleanBody, 180);
}

function articleVariants(article: { title: string; excerpt: string; content: string; category: string }, language: SearchLanguage) {
  const envelope = extractArticleTranslations(article.content);
  const variants = Object.entries(envelope.translations).flatMap(([code, translation]) => translation ? [{
    language: code as SearchLanguage,
    title: translation.title || article.title,
    excerpt: translation.excerpt || article.excerpt,
    category: translation.category || article.category,
    content: translation.content || article.content,
  }] : []);
  if (!variants.length) return [{ ...article, language: envelope.originalLanguage }];
  return variants.sort((left, right) => Number(right.language === language) - Number(left.language === language));
}

export async function searchOffContent(rawQuery: string, preferredLanguage: SearchLanguage = "es"): Promise<OffSearchResult[]> {
  const query = rawQuery.trim().slice(0, 120);
  if (normalizeSearchText(query).length < 2) return [];

  const db = getDb();
  const [articles, galleryPosts, loungeItems, conversations] = await Promise.all([
    db.article.findMany({
      where: { status: "published", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } },
      select: { id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true, category: true, keywords: true, featured: true, publishedAt: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 400,
    }),
    db.galleryPost.findMany({
      where: { status: "published" },
      select: { id: true, mediaType: true, mediaUrl: true, thumbnailUrl: true, title: true, caption: true, altText: true, category: true, keywords: true, audioTitle: true, audioArtist: true, publishedAt: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 400,
    }),
    db.loungeContent.findMany({
      where: { status: "published", type: { in: ["LIBRARY", "SIGNAL", "RESOURCE", "NATHALIE_NOTE"] } },
      select: { id: true, type: true, title: true, description: true, content: true, keywords: true, publishedAt: true },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }], take: 300,
    }),
    db.editorialConversation.findMany({
      where: { status: "published" },
      select: { id: true, question: true, introduction: true, themes: true, publishedAt: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 200,
    }),
  ]);

  const ranked = [
    ...articles.map((article) => {
      const variants = articleVariants(article, preferredLanguage).map((variant) => {
        const body = articleBodyText(variant.content);
        return { variant, body, match: scoreSearchDocument(query, { ...variant, keywords: article.keywords, body }, preferredLanguage) };
      }).sort((left, right) => right.match.score - left.match.score);
      const best = variants[0];
      return { score: best.match.score + (article.featured ? 4 : 0), date: article.publishedAt?.getTime() ?? 0, result: {
        id: article.id, type: "article" as const, title: getPlainTextPreview(best.variant.title, 120),
        excerpt: matchingSnippet(best.match.matchedTerms, best.variant.excerpt, best.body), thumbnail: article.coverImage || undefined,
        category: best.variant.category, href: `/off/${article.slug}`,
      } };
    }),
    ...galleryPosts.map((post) => {
      const category = GALLERY_CATEGORY_LABELS[post.category];
      const body = `${post.altText ?? ""} ${post.audioTitle ?? ""} ${post.audioArtist ?? ""}`;
      const match = scoreSearchDocument(query, { title: post.title || post.caption || category, excerpt: post.caption ?? "", category, keywords: post.keywords, body }, preferredLanguage);
      return { score: match.score, date: post.publishedAt?.getTime() ?? 0, result: {
        id: post.id, type: "gallery" as const, title: getPlainTextPreview(post.title || post.caption || category, 120),
        excerpt: matchingSnippet(match.matchedTerms, post.caption ?? "", body) || undefined,
        thumbnail: post.thumbnailUrl ?? (post.mediaType === "IMAGE" ? post.mediaUrl : undefined), category, galleryId: post.id,
      } };
    }),
    ...loungeItems.map((item) => {
      const match = scoreSearchDocument(query, { title: item.title, excerpt: item.description ?? "", category: item.type, keywords: item.keywords, body: stripHtml(item.content ?? "") }, preferredLanguage);
      return { score: match.score, date: item.publishedAt?.getTime() ?? 0, result: {
        id: item.id, type: LOUNGE_RESULT_TYPES[item.type as keyof typeof LOUNGE_RESULT_TYPES], title: getPlainTextPreview(item.title, 120),
        excerpt: matchingSnippet(match.matchedTerms, item.description ?? "", item.content ?? "") || undefined, category: item.type,
        href: item.type === "LIBRARY" ? "/lounge#biblioteca" : "/lounge",
      } };
    }),
    ...conversations.map((conversation) => {
      const match = scoreSearchDocument(query, {
        title: conversation.question,
        excerpt: conversation.introduction ?? "",
        category: "Conversaciones OFF",
        keywords: conversation.themes,
        body: conversation.introduction ?? "",
      }, preferredLanguage);
      return { score: match.score, date: conversation.publishedAt?.getTime() ?? 0, result: {
        id: conversation.id,
        type: "conversation" as const,
        title: getPlainTextPreview(conversation.question, 120),
        excerpt: matchingSnippet(match.matchedTerms, conversation.introduction ?? "", conversation.question) || undefined,
        category: "Conversaciones OFF",
        href: `/lounge/community#conversation-${conversation.id}`,
      } };
    }),
  ];

  return ranked.filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || right.date - left.date).slice(0, 30).map((entry) => entry.result);
}

export async function galleryCategoryResults(category: GalleryCategory): Promise<OffSearchResult[]> {
  const posts = await getDb().galleryPost.findMany({ where: { category, status: "published" }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 24 });
  return posts.map((post) => ({
    id: post.id, type: "gallery", title: getPlainTextPreview(post.title || post.caption || GALLERY_CATEGORY_LABELS[post.category], 120),
    excerpt: post.caption ? getPlainTextPreview(post.caption, 180) : undefined,
    thumbnail: post.thumbnailUrl ?? (post.mediaType === "IMAGE" ? post.mediaUrl : undefined), category: GALLERY_CATEGORY_LABELS[post.category], galleryId: post.id,
  }));
}
