import { unstable_noStore as noStore } from "next/cache";
import { ArticleEditor } from "@/components/ArticleEditor";
import { getAllArticles } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  noStore();
  await requireAdmin();
  const articles = await getAllArticles();
  const { category } = await searchParams;

  return (
    <main className="admin-page editor-admin-page">
      <ArticleEditor articles={articles} initialCategory={category} />
    </main>
  );
}
