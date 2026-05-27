import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";
import { getArticleById } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) redirect("/admin");

  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) notFound();

  return (
    <main className="admin-page">
      <div className="admin-header">
        <Link href="/admin" className="brand">
          <span className="brand-mark">O</span>
          Editar capítulo
        </Link>
      </div>
      <ArticleEditor article={article} />
    </main>
  );
}
