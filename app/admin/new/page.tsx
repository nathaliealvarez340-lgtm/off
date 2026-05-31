import { unstable_noStore as noStore } from "next/cache";
import { ArticleEditor } from "@/components/ArticleEditor";
import { getAllArticles } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";

export default async function NewArticlePage() {
  noStore();
  await requireAdmin();
  const articles = await getAllArticles();

  return (
    <main className="admin-page editor-admin-page">
      <ArticleEditor articles={articles} />
    </main>
  );
}
