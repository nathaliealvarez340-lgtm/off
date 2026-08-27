import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPlainTextPreview, INTERNAL_CONTENT_CATEGORIES } from "@/lib/articles";
import { extractArticleTranslations } from "@/lib/article-localization";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sortEditorially } from "@/lib/editorial-order";
import { getPublishedGalleryPosts, serializeGalleryPost } from "@/lib/gallery";
import { earnedBadges, formatActiveTime, getOrCreateMemberNumber } from "@/lib/member-progress";
import { ResponsiveMemberLounge } from "@/mobile/ResponsiveMemberLounge";
import { normalizeUiLanguage } from "@/lib/ui-i18n";

export const metadata: Metadata = {
  title: "The Member Lounge | OFF",
  robots: { index: false, follow: false },
};

function isAutomaticLoungeContent(statusLabel?: string | null) {
  return /autom|generado/i.test(statusLabel ?? "");
}

export default async function LoungePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lounge");
  if (user.role === "ADMIN") redirect("/admin");

  const db = getDb();
  const now = new Date();
  const [rawArticles, drafts, memberNumber, loungeContent, activity, completedCount, lastReading, notification, galleryRows, activeRitual] = await Promise.all([
    db.article.findMany({ where: { status: "published", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } } }),
    db.article.findMany({ where: { status: "draft", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: { updatedAt: "desc" }, take: 4 }),
    getOrCreateMemberNumber(user.id),
    db.loungeContent.findMany({ where: { status: "published" }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] }),
    db.memberActivity.findUnique({ where: { userId: user.id } }),
    db.articleCompletion.count({ where: { userId: user.id } }),
    db.articleReadingProgress.findFirst({
      where: { userId: user.id, article: { status: "published" } },
      orderBy: { updatedAt: "desc" },
      select: { articleId: true, progress: true, lastPosition: true },
    }),
    db.notification.findFirst({
      where: { userId: user.id, read: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, message: true, href: true },
    }),
    getPublishedGalleryPosts({ take: 17, viewerId: user.id }),
    db.ritual.findFirst({ where: { status: "published", activeFrom: { lte: now }, activeUntil: { gte: now } }, include: { responses: { where: { userId: user.id }, select: { content: true }, take: 1 } }, orderBy: { activeFrom: "desc" } }),
  ]);
  const articles = sortEditorially(rawArticles);
  const visibleLoungeContent = loungeContent.filter((item) => !isAutomaticLoungeContent(item.statusLabel));

  return (
    <ResponsiveMemberLounge
      name={user.name}
      memberSince={user.createdAt.toISOString()}
      memberNumber={String(memberNumber)}
      activeTime={formatActiveTime(activity?.totalSeconds ?? 0)}
      completedCount={completedCount}
      badges={earnedBadges(completedCount)}
      articles={articles.map((article, index) => ({
        id: article.id,
        title: getPlainTextPreview(article.title, 140),
        slug: article.slug,
        excerpt: getPlainTextPreview(article.excerpt),
        coverImage: article.coverImage,
        category: article.category,
        publishedAt: article.publishedAt?.toISOString() ?? article.updatedAt.toISOString(),
        readTime: article.readTime,
        translations: extractArticleTranslations(article.content).translations,
        editionNumber: index + 1,
      }))}
      loungeContent={visibleLoungeContent.map((item) => ({
        id: item.id,
        type: item.type,
        title: getPlainTextPreview(item.title, 140),
        number: item.number,
        description: item.description ? getPlainTextPreview(item.description) : null,
        content: item.content ? getPlainTextPreview(item.content, 2400) : null,
        links: Array.isArray(item.links) ? item.links : [],
        relatedArticle: item.relatedArticle,
        releaseDate: item.releaseDate?.toISOString() ?? null,
        statusLabel: item.statusLabel,
      }))}
      draftEditions={drafts.map((article) => ({
        id: article.id,
        title: getPlainTextPreview(article.title, 140),
        excerpt: getPlainTextPreview(article.excerpt),
        date: article.updatedAt.toISOString(),
        translations: extractArticleTranslations(article.content).translations,
      }))}
      lastReadArticleId={lastReading?.articleId ?? null}
      lastReadProgress={lastReading?.progress ?? 0}
      lastReadPosition={lastReading?.lastPosition ?? 0}
      preferredLanguage={normalizeUiLanguage(user.preferredLanguage)}
      notification={notification}
      galleryPosts={galleryRows.slice(0, 16).map((post) => serializeGalleryPost(post, user.id))}
      galleryHasMore={galleryRows.length > 16}
      activeRitual={activeRitual ? { id: activeRitual.id, title: activeRitual.title, prompt: activeRitual.prompt, response: activeRitual.responses[0]?.content ?? null } : null}
    />
  );
}
