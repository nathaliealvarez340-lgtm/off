import Link from "next/link";
import { ArticleEditor } from "@/components/ArticleEditor";
import { requireAdmin } from "@/lib/auth";

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <main className="admin-page">
      <div className="admin-header">
        <Link href="/admin" className="brand">
          <span className="brand-mark">O</span>
          Nuevo capítulo
        </Link>
      </div>
      <ArticleEditor />
    </main>
  );
}
