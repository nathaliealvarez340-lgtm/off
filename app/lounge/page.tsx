import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemberLounge } from "@/components/MemberLounge";
import { getPlainTextPreview, INTERNAL_CONTENT_CATEGORIES } from "@/lib/articles";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

function memberNumber(value: number) {
  return String(value).padStart(6, "0");
}

export const metadata: Metadata = {
  title: "The Member Lounge | OFF",
  robots: { index: false, follow: false },
};

export default async function LoungePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lounge");
  if (user.role === "ADMIN") redirect("/admin");

  const db = getDb();
  const [articles, drafts, position, internalContent] = await Promise.all([
    db.article.findMany({ where: { status: "published", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] }),
    db.article.findMany({ where: { status: "draft", category: { notIn: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: { updatedAt: "desc" }, take: 4 }),
    db.user.count({ where: { createdAt: { lte: user.createdAt } } }),
    db.article.findMany({ where: { status: "published", category: { in: [...INTERNAL_CONTENT_CATEGORIES] } }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <MemberLounge
      name={user.name}
      memberSince={user.createdAt.toISOString()}
      memberNumber={memberNumber(position)}
      articles={articles.map((article) => ({
        id: article.id,
        title: getPlainTextPreview(article.title, 140),
        slug: article.slug,
        excerpt: getPlainTextPreview(article.excerpt),
        coverImage: article.coverImage,
        readTime: article.readTime,
      }))}
      earlyEditions={drafts.map((article) => ({
        id: article.id,
        title: getPlainTextPreview(article.title, 140),
        excerpt: getPlainTextPreview(article.excerpt),
        date: article.updatedAt.toISOString(),
      }))}
      internalContent={internalContent.map((item) => ({
        id: item.id,
        title: getPlainTextPreview(item.title, 140),
        excerpt: getPlainTextPreview(item.excerpt),
        category: item.category,
      }))}
    />
  );
}
