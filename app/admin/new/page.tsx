import Link from "next/link";
import { redirect } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";
import { isAdminSession } from "@/lib/auth";

export default async function NewArticlePage() {
  if (!(await isAdminSession())) redirect("/admin");

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
