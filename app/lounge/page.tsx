import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemberLounge } from "@/components/MemberLounge";
import { getPlainTextPreview, INTERNAL_CONTENT_CATEGORIES } from "@/lib/articles";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { earnedBadges, formatActiveTime, getOrCreateMemberNumber } from "@/lib/member-progress";

export const metadata: Metadata = {
  title: "The Member Lounge | OFF",
  robots: { index: false, follow: false },
};

export default async function LoungePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lounge");
  if (user.role === "ADMIN") redirect("/admin");

  const db = getDb();
  const [articles, drafts, memberNumber, loungeContent, activity, completedCount] = await Promise.all([
    db.article.findMany({ where: { status: "published", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] }),
    db.article.findMany({ where: { status: "draft", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: { updatedAt: "desc" }, take: 4 }),
    getOrCreateMemberNumber(user.id),
    db.loungeContent.findMany({ where: { status: "published" }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }] }),
    db.memberActivity.findUnique({ where: { userId: user.id } }),
    db.articleCompletion.count({ where: { userId: user.id } }),
  ]);

  return (
    <MemberLounge
      name={user.name}
      memberSince={user.createdAt.toISOString()}
      memberNumber={String(memberNumber)}
      activeTime={formatActiveTime(activity?.totalSeconds ?? 0)}
      completedCount={completedCount}
      badges={earnedBadges(completedCount)}
      articles={articles.map((article) => ({
        id: article.id,
        title: getPlainTextPreview(article.title, 140),
        slug: article.slug,
        excerpt: getPlainTextPreview(article.excerpt),
        coverImage: article.coverImage,
        category: article.category,
        publishedAt: article.publishedAt?.toISOString() ?? article.updatedAt.toISOString(),
        readTime: article.readTime,
      }))}
      loungeContent={loungeContent.map((item) => ({
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
      }))}
    />
  );
}
