import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { getArticleById } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) notFound();

  return (
    <main className="admin-page">
      <div className="admin-header">
        <Link href="/admin" className="brand">
          <span className="brand-mark">O</span>
          Editar capitulo
        </Link>
        <DeleteArticleButton articleId={article.id} />
      </div>
      <ArticleEditor article={article} />
    </main>
  );
}
