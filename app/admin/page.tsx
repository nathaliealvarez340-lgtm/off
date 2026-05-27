import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { formatDate, getAllArticles } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    redirect("/login");
  }

  const articles = await getAllArticles();

  return (
    <main className="admin-page">
      <div className="admin-header">
        <Link href="/" className="brand">
          <span className="brand-mark">O</span>
          OFF Admin
        </Link>
        <form action={logoutAction}>
          <button className="ghost-button" type="submit">
            Salir
          </button>
        </form>
      </div>

      <section className="admin-panel">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Contenido</p>
            <h1 className="section-title">Capítulos</h1>
          </div>
          <Link className="button" href="/admin/new">
            Nuevo artículo
          </Link>
        </div>

        <div className="admin-table">
          {articles.map((article) => (
            <div className="admin-row" key={article.id}>
              <div>
                <strong>{article.title}</strong>
                <div className="meta">
                  <span>{article.status}</span>
                  <span>{article.category}</span>
                  <span>{formatDate(article.publishedAt)}</span>
                  {article.featured ? <span>Destacado</span> : null}
                </div>
              </div>
              <Link className="ghost-button" href={`/off/${article.slug}`}>
                Ver
              </Link>
              <Link className="button" href={`/admin/${article.id}`}>
                Editar
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
