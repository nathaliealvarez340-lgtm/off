import { ArticleEditor } from "@/components/ArticleEditor";
import { getAllArticles } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";

export default async function NewArticlePage() {
  await requireAdmin();
  const articles = await getAllArticles();

  return (
    <main className="admin-page editor-admin-page">
      <ArticleEditor articles={articles} />
    </main>
  );
}
