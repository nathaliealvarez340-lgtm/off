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
  | { type: "gallery" | "collage"; images: Array<{ src: string; alt?: string; caption?: string }>; caption?: string; template?: string }
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

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function stripHtml(value: string) {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<hr\b[^>]*>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|div|h[1-6]|blockquote|li)>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  ).replace(/\s+/g, " ").trim();
}

export function getPlainTextPreview(value: string, maxLength = 180) {
  const text = stripHtml(value);
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function safeInlineStyle(attrs?: Record<string, unknown>) {
  if (!attrs) return "";
  const styles = [
    ["color", attrs.color],
    ["background-color", attrs.backgroundColor],
    ["font-size", attrs.fontSize],
    ["line-height", attrs.lineHeight],
    ["font-family", attrs.fontFamily],
    ["font-variation-settings", attrs.fontVariationSettings],
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && !/url|expression|javascript/i.test(entry[1]))
    .map(([name, value]) => `${name}: ${value}`);
  return styles.length ? ` style="${escapeHtml(styles.join("; "))}"` : "";
}

function tiptapInlineHtml(node: TiptapNode): string {
  if (node.type === "hardBreak") return "<br>";
  if (node.type !== "text") return (node.content ?? []).map(tiptapInlineHtml).join("");

  let html = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") html = `<strong>${html}</strong>`;
    else if (mark.type === "italic") html = `<em>${html}</em>`;
    else if (mark.type === "underline") html = `<u>${html}</u>`;
    else if (mark.type === "strike") html = `<s>${html}</s>`;
    else if (mark.type === "highlight") html = `<mark${safeInlineStyle({ backgroundColor: mark.attrs?.color })}>${html}</mark>`;
    else if (mark.type === "textStyle") html = `<span${safeInlineStyle(mark.attrs)}>${html}</span>`;
    else if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" && /^(https?:\/\/|\/|#|mailto:)/i.test(mark.attrs.href) ? mark.attrs.href : "#";
      html = `<a href="${escapeHtml(href)}" rel="noreferrer">${html}</a>`;
    }
  }
  return html;
}

function tiptapBlocks(nodes: TiptapNode[] = []): EditorialBlock[] {
  const blocks: EditorialBlock[] = [];

  for (const node of nodes) {
    const text = (node.content ?? []).map(tiptapInlineHtml).join("");
    if (node.type === "paragraph" && stripHtml(text)) blocks.push({ type: "paragraph", text });
    else if (node.type === "heading") {
      const level = Number(node.attrs?.level);
      blocks.push({ type: level === 1 ? "h1" : level === 2 ? "h2" : "h3", text });
    } else if (node.type === "blockquote") blocks.push({ type: "quote", text });
    else if (node.type === "codeBlock") blocks.push({ type: "code", text: stripHtml(text) });
    else if (node.type === "horizontalRule") blocks.push({ type: "divider" });
    else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = (node.content ?? []).map((item) => (item.content ?? []).map(tiptapInlineHtml).join("")).filter((item) => stripHtml(item));
      blocks.push({ type: node.type === "orderedList" ? "numbered" : "list", items });
    } else if (node.type === "image" && typeof node.attrs?.src === "string") {
      blocks.push({ type: "image", src: node.attrs.src, alt: String(node.attrs.alt ?? "Imagen editorial"), caption: String(node.attrs.caption ?? "") });
    } else if (node.type === "videoEmbed" && typeof node.attrs?.src === "string") {
      blocks.push({ type: "video", url: node.attrs.src, caption: String(node.attrs.caption ?? ""), label: String(node.attrs.size ?? "medium") });
    } else if (node.type === "spotifyEmbed" && typeof node.attrs?.url === "string") {
      blocks.push({ type: "embed", url: node.attrs.url, caption: "spotify", label: String(node.attrs.title ?? "Contenido de Spotify") });
    } else if (node.content?.length) {
      blocks.push(...tiptapBlocks(node.content));
    }
  }

  return blocks;
}

function htmlAttribute(source: string, name: string) {
  const match = source.match(new RegExp(`\\s${name}=["']([^"']*)["']`, "i"));
  return match?.[1] ?? "";
}

function safePublicUrl(value: string) {
  return /^(https?:\/\/|\/)/i.test(value) ? value : "";
}

function htmlBlocks(content: string): EditorialBlock[] {
  const blocks: EditorialBlock[] = [];
  const blockPattern = /<(p|h1|h2|h3|blockquote|pre|ul|ol|figure)\b[^>]*>([\s\S]*?)<\/\1>|<a\b[^>]*data-spotify-card[^>]*>[\s\S]*?<\/a>|<(img|video)\b[^>]*>|<hr\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(content))) {
    if (/^<hr/i.test(match[0])) {
      blocks.push({ type: "divider" });
      continue;
    }

    const standaloneTag = match[3]?.toLowerCase();
    if (/^<a\b/i.test(match[0])) {
      const url = safePublicUrl(htmlAttribute(match[0], "href"));
      if (url) blocks.push({ type: "embed", url, caption: "spotify", label: htmlAttribute(match[0], "data-title") || stripHtml(match[0]) || "Contenido de Spotify" });
      continue;
    }

    if (standaloneTag === "img" || standaloneTag === "video") {
      const src = safePublicUrl(htmlAttribute(match[0], "src"));
      if (!src) continue;
      if (standaloneTag === "img") blocks.push({ type: "image", src, alt: htmlAttribute(match[0], "alt") || "Imagen editorial" });
      else blocks.push({ type: "video", url: src, label: htmlAttribute(match[0], "data-size") || "medium" });
      continue;
    }

    const tag = match[1].toLowerCase();
    const inner = match[2] ?? "";
    if (tag === "figure") {
      const image = inner.match(/<img\b[^>]*>/i)?.[0];
      const video = inner.match(/<video\b[^>]*>/i)?.[0];
      const caption = stripHtml(inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? "");
      if (image) {
        const src = safePublicUrl(htmlAttribute(image, "src"));
        if (src) blocks.push({ type: "image", src, alt: htmlAttribute(image, "alt") || "Imagen editorial", caption });
      } else if (video) {
        const url = safePublicUrl(htmlAttribute(video, "src"));
        if (url) blocks.push({ type: "video", url, caption, label: htmlAttribute(video, "data-size") || "medium" });
      }
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi), (item) => item[1]).filter((item) => stripHtml(item));
      if (items.length) blocks.push({ type: tag === "ol" ? "numbered" : "list", items });
    } else if (stripHtml(inner)) {
      const type = tag === "p" ? "paragraph" : tag === "blockquote" ? "quote" : tag === "pre" ? "code" : tag;
      blocks.push({ type: type as "paragraph" | "h1" | "h2" | "h3" | "quote" | "code", text: tag === "pre" ? stripHtml(inner) : inner });
    }
  }

  if (blocks.length) return blocks;
  const text = stripHtml(content);
  return text ? [{ type: "paragraph", text: escapeHtml(text) }] : [];
}

export function parseArticleContent(content: string): EditorialBlock[] {
  let blocks: EditorialBlock[];
  try {
    const parsed = JSON.parse(content) as EditorialBlock[] | TiptapNode;
    if (Array.isArray(parsed)) blocks = parsed;
    else if (parsed?.type === "doc") blocks = tiptapBlocks(parsed.content);
    else blocks = htmlBlocks(content);
  } catch {
    blocks = /<[a-z][\s\S]*>/i.test(content)
      ? htmlBlocks(content)
      : content.split(/\n{2,}/).filter(Boolean).map((text) => ({ type: "paragraph", text }));
  }

  return blocks.filter((block, index) => {
    if (block.type === "paragraph") {
      const normalizedText = stripHtml(block.text).trim().toUpperCase();
      if (["INSTAGRAM", "LINKEDIN", "SUBSTACK"].includes(normalizedText)) return false;
      if (normalizedText.includes("© 2026 NATHALIE GARCIA FOR MAIA")) return false;
    }
    if (block.type !== "paragraph" || index === 0) return true;
    const previous = blocks[index - 1];
    if ((previous.type !== "image" && previous.type !== "video") || !previous.caption) return true;
    return stripHtml(block.text) !== stripHtml(previous.caption);
  });
}

export function renderRichContent(content: string) {
  return parseArticleContent(content);
}

export const INTERNAL_CONTENT_CATEGORIES = [
  "Biblioteca curada",
  "Nota privada",
  "Archivo desbloqueado",
  "Early Access",
] as const;

export function isInternalContentCategory(category: string) {
  return INTERNAL_CONTENT_CATEGORIES.includes(category as (typeof INTERNAL_CONTENT_CATEGORIES)[number]);
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
    where: { status: "published", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } },
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
