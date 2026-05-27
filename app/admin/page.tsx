import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { formatDate, getAllArticles } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";

export default async function AdminPage() {
  const isAdmin = await isAdminSession();

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <Link href="/" className="brand">
          <span className="brand-mark">O</span>
          OFF
        </Link>
        <section className="section" style={{ paddingTop: 48 }}>
          <p className="eyebrow">Panel privado</p>
          <h1 className="section-title">Entrar al editor OFF</h1>
          <p style={{ color: "var(--smoke)", maxWidth: 620 }}>
            Solo el usuario administrador puede crear, editar y publicar capítulos.
          </p>
          <div className="admin-panel" style={{ maxWidth: 520, marginTop: 24 }}>
            <AdminLoginForm />
          </div>
        </section>
      </main>
    );
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
