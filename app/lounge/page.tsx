import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemberLounge } from "@/components/MemberLounge";
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
  const [articles, drafts, position] = await Promise.all([
    db.article.findMany({ where: { status: "published" }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] }),
    db.article.findMany({ where: { status: "draft" }, orderBy: { updatedAt: "desc" }, take: 4 }),
    db.user.count({ where: { createdAt: { lte: user.createdAt } } }),
  ]);
  const memberSince = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(user.createdAt);

  return (
    <MemberLounge
      name={user.name}
      memberSince={memberSince}
      memberNumber={memberNumber(position)}
      articles={articles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        readTime: article.readTime,
      }))}
      earlyEditions={drafts.map((article) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        date: new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(article.updatedAt),
      }))}
    />
  );
}
