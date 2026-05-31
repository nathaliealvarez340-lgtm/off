import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";
import { getAllArticles, getArticleById } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  noStore();
  await requireAdmin();

  const { id } = await params;
  const [article, articles] = await Promise.all([getArticleById(id), getAllArticles()]);

  if (!article) notFound();

  return (
    <main className="admin-page editor-admin-page">
      <ArticleEditor article={article} articles={articles} />
    </main>
  );
}
